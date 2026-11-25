import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Patch, Post, Delete, Req, UseGuards } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AuthenticatedRequest, OrganisationGuard } from '../auth/organisation.guard';
import { assertCanWrite } from '../auth/roles';

const DEFAULT_STAGES = [
  { key: 'INTAKE', name: 'Intake', description: 'Capture the opportunity, request or problem.', isGate: false },
  { key: 'DISCOVERY', name: 'Discovery', description: 'Validate the problem, users and desired outcomes.', isGate: false },
  { key: 'PLANNING', name: 'Planning', description: 'Agree scope, ownership, dependencies and delivery plan.', isGate: true },
  { key: 'DEVELOPMENT', name: 'Development', description: 'Build and review the agreed solution.', isGate: false },
  { key: 'TESTING_UAT', name: 'Testing & UAT', description: 'Verify quality and obtain user acceptance.', isGate: true },
  { key: 'RELEASE', name: 'Release', description: 'Complete release readiness and deployment approvals.', isGate: true },
  { key: 'LIVE_MONITORING', name: 'Live & Monitoring', description: 'Monitor adoption, reliability and measurable outcomes.', isGate: false },
];
const INITIATIVE_STATUSES = ['PROPOSED','DISCOVERY','PLANNING','IN_PROGRESS','AT_RISK','BLOCKED','COMPLETED','CANCELLED'];
const MILESTONE_STATUSES = ['UPCOMING','IN_PROGRESS','COMPLETED','AT_RISK'];

@Controller()
@UseGuards(OrganisationGuard)
export class InitiativesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('products/:productId/initiatives')
  async list(@Req() req: AuthenticatedRequest, @Param('productId') productId: string) {
    const org = req.organisationMembership!.organisationId;
    await this.assertProduct(productId, org);
    return this.prisma.initiative.findMany({ where: { organisationId: org, productId }, include: { milestones: { orderBy: { sortOrder: 'asc' } }, _count: { select: { requirements: true, actionItems: true } } }, orderBy: [{ targetDate: 'asc' }, { createdAt: 'desc' }] });
  }

  @Post('products/:productId/initiatives')
  async create(@Req() req: AuthenticatedRequest, @Param('productId') productId: string, @Body() body: any) {
    assertCanWrite(req); const org = req.organisationMembership!.organisationId; await this.assertProduct(productId, org);
    if (typeof body?.name !== 'string' || !body.name.trim() || body.name.trim().length > 180) throw new BadRequestException('Initiative name must contain 1–180 characters.');
    const status = body.status ?? 'PROPOSED'; if (!INITIATIVE_STATUSES.includes(status)) throw new BadRequestException('Invalid initiative status.');
    const data = { organisationId: org, productId, name: body.name.trim(), stageKey: 'INTAKE', objective: this.optionalText(body.objective, 3000), description: this.optionalText(body.description, 10000), status, ownerLabel: this.optionalText(body.ownerLabel, 160), startDate: this.date(body.startDate), targetDate: this.date(body.targetDate) };
    return this.prisma.$transaction(async tx => {
      const row = await tx.initiative.create({ data, include: { milestones: true, _count: { select: { requirements: true, actionItems: true } } } });
      await tx.auditLog.create({ data: { organisationId: org, actorUserId: req.organisationMembership!.userId, entityType: 'Initiative', entityId: row.id, action: 'CREATED', after: row as unknown as Prisma.InputJsonValue } });
      return row;
    });
  }

  @Patch('initiatives/:initiativeId')
  async update(@Req() req: AuthenticatedRequest, @Param('initiativeId') id: string, @Body() body: any) {
    assertCanWrite(req); const org = req.organisationMembership!.organisationId;
    const before = await this.prisma.initiative.findFirst({ where: { id, organisationId: org } }); if (!before) throw new NotFoundException('Initiative not found.');
    const data: any = {};
    if (body.name !== undefined) { if (typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 180) throw new BadRequestException('Invalid initiative name.'); data.name = body.name.trim(); }
    for (const [field, max] of [['objective',3000],['description',10000],['ownerLabel',160]] as const) if (body[field] !== undefined) data[field] = this.optionalText(body[field], max);
    if (body.status !== undefined) { if (!INITIATIVE_STATUSES.includes(body.status)) throw new BadRequestException('Invalid initiative status.'); data.status = body.status; if (body.status === 'COMPLETED') data.completedAt = new Date(); if (body.status !== 'COMPLETED') data.completedAt = null; }
    if (body.startDate !== undefined) data.startDate = this.date(body.startDate);
    if (body.targetDate !== undefined) data.targetDate = this.date(body.targetDate);
    return this.prisma.$transaction(async tx => { const row = await tx.initiative.update({ where: { id }, data, include: { milestones: { orderBy: { sortOrder: 'asc' } }, _count: { select: { requirements: true, actionItems: true } } } }); await tx.auditLog.create({ data: { organisationId: org, actorUserId: req.organisationMembership!.userId, entityType: 'Initiative', entityId: id, action: 'UPDATED', before: before as unknown as Prisma.InputJsonValue, after: row as unknown as Prisma.InputJsonValue } }); return row; });
  }

  @Delete('initiatives/:initiativeId')
  async remove(@Req() req: AuthenticatedRequest, @Param('initiativeId') id: string) {
    assertCanWrite(req); const org = req.organisationMembership!.organisationId; const before = await this.prisma.initiative.findFirst({ where: { id, organisationId: org } }); if (!before) throw new NotFoundException('Initiative not found.');
    await this.prisma.$transaction(async tx => { await tx.auditLog.create({ data: { organisationId: org, actorUserId: req.organisationMembership!.userId, entityType: 'Initiative', entityId: id, action: 'DELETED', before: before as unknown as Prisma.InputJsonValue } }); await tx.initiative.delete({ where: { id } }); }); return { deleted: true };
  }

  @Post('initiatives/:initiativeId/milestones')
  async addMilestone(@Req() req: AuthenticatedRequest, @Param('initiativeId') id: string, @Body() body: any) {
    assertCanWrite(req); const org = req.organisationMembership!.organisationId; const initiative = await this.prisma.initiative.findFirst({ where: { id, organisationId: org }, select: { id: true } }); if (!initiative) throw new NotFoundException('Initiative not found.');
    if (typeof body?.title !== 'string' || !body.title.trim() || body.title.trim().length > 180) throw new BadRequestException('Milestone title must contain 1–180 characters.');
    const status = body.status ?? 'UPCOMING'; if (!MILESTONE_STATUSES.includes(status)) throw new BadRequestException('Invalid milestone status.');
    const count = await this.prisma.initiativeMilestone.count({ where: { initiativeId: id } });
    return this.prisma.$transaction(async tx => { const row = await tx.initiativeMilestone.create({ data: { initiativeId: id, title: body.title.trim(), description: this.optionalText(body.description, 3000), status, dueDate: this.date(body.dueDate), sortOrder: Number.isInteger(body.sortOrder) ? body.sortOrder : count, ...(status === 'COMPLETED' ? { completedAt: new Date() } : {}) } }); await tx.auditLog.create({ data: { organisationId: org, actorUserId: req.organisationMembership!.userId, entityType: 'InitiativeMilestone', entityId: row.id, action: 'CREATED', after: row as unknown as Prisma.InputJsonValue } }); return row; });
  }

  @Patch('milestones/:milestoneId')
  async updateMilestone(@Req() req: AuthenticatedRequest, @Param('milestoneId') id: string, @Body() body: any) {
    assertCanWrite(req); const org = req.organisationMembership!.organisationId; const before = await this.prisma.initiativeMilestone.findFirst({ where: { id, initiative: { organisationId: org } } }); if (!before) throw new NotFoundException('Milestone not found.');
    const data: any = {}; if (body.title !== undefined) { if (typeof body.title !== 'string' || !body.title.trim()) throw new BadRequestException('Milestone title is required.'); data.title = body.title.trim(); }
    if (body.description !== undefined) data.description = this.optionalText(body.description, 3000);
    if (body.status !== undefined) { if (!MILESTONE_STATUSES.includes(body.status)) throw new BadRequestException('Invalid milestone status.'); data.status = body.status; data.completedAt = body.status === 'COMPLETED' ? new Date() : null; }
    if (body.dueDate !== undefined) data.dueDate = this.date(body.dueDate); if (body.sortOrder !== undefined) { if (!Number.isInteger(body.sortOrder) || body.sortOrder < 0) throw new BadRequestException('sortOrder must be a non-negative integer.'); data.sortOrder = body.sortOrder; }
    return this.prisma.$transaction(async tx => { const row = await tx.initiativeMilestone.update({ where: { id }, data }); await tx.auditLog.create({ data: { organisationId: org, actorUserId: req.organisationMembership!.userId, entityType: 'InitiativeMilestone', entityId: id, action: 'UPDATED', before: before as unknown as Prisma.InputJsonValue, after: row as unknown as Prisma.InputJsonValue } }); return row; });
  }

  @Post('action-items/:actionItemId/promote')
  async promoteAction(@Req() req: AuthenticatedRequest, @Param('actionItemId') actionId: string, @Body() body: any) {
    assertCanWrite(req); const org = req.organisationMembership!.organisationId;
    const action = await this.prisma.actionItem.findFirst({ where: { id: actionId, organisationId: org } }); if (!action) throw new NotFoundException('Action item not found.');
    const initiative = await this.prisma.initiative.findFirst({ where: { id: body?.initiativeId, organisationId: org, productId: action.productId }, select: { id: true } }); if (!initiative) throw new BadRequestException('Choose an initiative in the same product and organisation.');
    if (action.initiativeId === initiative.id) return { promoted: true, actionItem: action };
    return this.prisma.$transaction(async tx => { const updated = await tx.actionItem.update({ where: { id: actionId }, data: { initiativeId: initiative.id } }); await tx.auditLog.create({ data: { organisationId: org, actorUserId: req.organisationMembership!.userId, entityType: 'ActionItem', entityId: actionId, action: 'LINKED_TO_INITIATIVE', before: { initiativeId: action.initiativeId }, after: { initiativeId: initiative.id, initiativeName: (await tx.initiative.findUnique({ where: { id: initiative.id }, select: { name: true } }))?.name ?? null } as Prisma.InputJsonValue } }); return { promoted: true, actionItem: updated }; });
  }

  @Get('initiatives/:initiativeId/stage-readiness')
  async stageReadiness(@Req() req: AuthenticatedRequest, @Param('initiativeId') id: string) {
    const org = req.organisationMembership!.organisationId;
    const initiative = await this.prisma.initiative.findFirst({ where: { id, organisationId: org } });
    if (!initiative) throw new NotFoundException('Initiative not found.');
    const configured = await this.prisma.workflowStage.findMany({ where: { organisationId: org, productId: initiative.productId, isActive: true }, orderBy: { sortOrder: 'asc' } });
    const stages: any[] = configured.length ? configured : DEFAULT_STAGES;
    const assessments = await Promise.all(stages.map(stage => this.assessStageGate(org, initiative, stage)));
    return { initiativeId: id, currentStageKey: initiative.stageKey, generatedAt: new Date().toISOString(), stages: assessments };
  }

  private async assessStageGate(organisationId: string, initiative: { id: string; productId: string }, stage: any) {
    const rules = (stage.transitionRules ?? {}) as Record<string, unknown>;
    const checks: { key: string; label: string; count: number; satisfied: boolean }[] = [];
    const add = async (key: string, label: string, query: () => Promise<number>, expectZero = true) => {
      if (rules[key] !== true) return;
      const count = await query();
      checks.push({ key, label, count, satisfied: expectZero ? count === 0 : count > 0 });
    };
    if (stage.isGate) {
      await Promise.all([
        add('requireNoBlockedActions', 'Blocked actions', () => this.prisma.actionItem.count({ where: { organisationId, productId: initiative.productId, initiativeId: initiative.id, status: 'BLOCKED' } })),
        add('requireNoOpenActions', 'Open actions', () => this.prisma.actionItem.count({ where: { organisationId, productId: initiative.productId, initiativeId: initiative.id, status: { not: 'DONE' } } })),
        add('requireAllRequirementsScoped', 'Requirements still in discovery', () => this.prisma.requirement.count({ where: { organisationId, productId: initiative.productId, initiativeId: initiative.id, status: 'DISCOVERY' } })),
        add('requireAllRequirementsShipped', 'Requirements not shipped', () => this.prisma.requirement.count({ where: { organisationId, productId: initiative.productId, initiativeId: initiative.id, status: { not: 'SHIPPED' } } })),
        add('requireAllMilestonesCompleted', 'Incomplete milestones', () => this.prisma.initiativeMilestone.count({ where: { initiativeId: initiative.id, status: { not: 'COMPLETED' } } })),
        add('requireNoPendingApprovals', 'Pending initiative approvals', () => this.prisma.approvalRequest.count({ where: { organisationId, productId: initiative.productId, targetType: 'INITIATIVE', targetId: initiative.id, status: 'PENDING' } })),
        add('requireApprovedInitiativeApproval', 'Approved initiative approvals required', () => this.prisma.approvalRequest.count({ where: { organisationId, productId: initiative.productId, targetType: 'INITIATIVE', targetId: initiative.id, status: 'APPROVED' } }), false),
      ]);
    }
    const blockers = checks.filter(check => !check.satisfied).map(check => check.key === 'requireApprovedInitiativeApproval' ? 'At least one approved initiative-level approval is required.' : `${check.count} ${check.label.toLowerCase()} remain.`);
    return { key: stage.key, name: stage.name, isGate: Boolean(stage.isGate), ready: blockers.length === 0, configuredChecks: checks.length, checks, blockers, note: stage.isGate && checks.length === 0 ? 'This stage is marked as a gate, but no gate rules are configured.' : null };
  }

  @Post('initiatives/:initiativeId/transition')
  async transition(@Req() req: AuthenticatedRequest, @Param('initiativeId') id: string, @Body() body: any) {
    assertCanWrite(req); const org = req.organisationMembership!.organisationId;
    const initiative = await this.prisma.initiative.findFirst({ where: { id, organisationId: org } }); if (!initiative) throw new NotFoundException('Initiative not found.');
    if (typeof body?.toStageKey !== 'string' || !/^[A-Z0-9_]{2,40}$/.test(body.toStageKey)) throw new BadRequestException('A valid target stage key is required.');
    const configured = await this.prisma.workflowStage.findMany({ where: { organisationId: org, productId: initiative.productId, isActive: true }, orderBy: { sortOrder: 'asc' } });
    const target: any = configured.length ? configured.find(x => x.key === body.toStageKey) : DEFAULT_STAGES.find(x => x.key === body.toStageKey);
    if (!target) throw new BadRequestException('The requested stage is not active in this product workflow.');
    if (initiative.stageKey === target.key) return { ...initiative, stageName: target.name };
    const assessment = await this.assessStageGate(org, initiative, target);
    if (assessment.blockers.length) throw new BadRequestException({ message: 'This workflow gate is not yet satisfied.', blockers: assessment.blockers });
    const note = this.optionalText(body.note, 2000);
    return this.prisma.$transaction(async tx => {
      const updated = await tx.initiative.update({ where: { id }, data: { stageKey: target.key } });
      await tx.workflowTransition.create({ data: { organisationId: org, initiativeId: id, actorUserId: req.organisationMembership!.userId, fromStageKey: initiative.stageKey, toStageKey: target.key, note } });
      await tx.auditLog.create({ data: { organisationId: org, actorUserId: req.organisationMembership!.userId, entityType: 'Initiative', entityId: id, action: 'WORKFLOW_STAGE_CHANGED', before: { stageKey: initiative.stageKey }, after: { stageKey: target.key, stageName: target.name, note } } });
      return { ...updated, stageName: target.name };
    });
  }

  @Get('initiatives/:initiativeId/transitions')
  async transitionHistory(@Req() req: AuthenticatedRequest, @Param('initiativeId') id: string) {
    const org = req.organisationMembership!.organisationId; const initiative = await this.prisma.initiative.findFirst({ where: { id, organisationId: org }, select: { id: true } }); if (!initiative) throw new NotFoundException('Initiative not found.');
    return this.prisma.workflowTransition.findMany({ where: { organisationId: org, initiativeId: id }, include: { actor: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: 'desc' } });
  }

  @Get('products/:productId/workflow-stages')
  async getWorkflow(@Req() req: AuthenticatedRequest, @Param('productId') productId: string) {
    const org = req.organisationMembership!.organisationId; await this.assertProduct(productId, org);
    const rows = await this.prisma.workflowStage.findMany({ where: { organisationId: org, productId }, orderBy: { sortOrder: 'asc' } });
    return rows.length ? rows : DEFAULT_STAGES.map((stage, sortOrder) => ({ ...stage, id: `default-${stage.key}`, organisationId: org, productId, sortOrder, isActive: true, transitionRules: {}, isDefault: true }));
  }

  @Post('products/:productId/workflow-stages')
  async saveWorkflow(@Req() req: AuthenticatedRequest, @Param('productId') productId: string, @Body() body: any) {
    assertCanWrite(req); const org = req.organisationMembership!.organisationId; await this.assertProduct(productId, org);
    if (!Array.isArray(body?.stages) || body.stages.length < 2 || body.stages.length > 20) throw new BadRequestException('Provide between 2 and 20 workflow stages.');
    const seen = new Set<string>(); const stages = body.stages.map((s: any, i: number) => { if (typeof s?.key !== 'string' || !/^[A-Z0-9_]{2,40}$/.test(s.key) || seen.has(s.key)) throw new BadRequestException('Every stage needs a unique uppercase key.'); seen.add(s.key); if (typeof s.name !== 'string' || !s.name.trim() || s.name.length > 80) throw new BadRequestException('Every stage needs a name of 1–80 characters.'); return { organisationId: org, productId, key: s.key, name: s.name.trim(), description: this.optionalText(s.description, 1000), sortOrder: i, isGate: Boolean(s.isGate), isActive: s.isActive !== false, transitionRules: (s.transitionRules && typeof s.transitionRules === 'object' ? s.transitionRules : {}) as Prisma.InputJsonValue }; });
    return this.prisma.$transaction(async tx => { await tx.workflowStage.deleteMany({ where: { organisationId: org, productId } }); return tx.workflowStage.createMany({ data: stages }); }).then(async () => this.prisma.workflowStage.findMany({ where: { organisationId: org, productId }, orderBy: { sortOrder: 'asc' } }));
  }

  private async assertProduct(id: string, org: string) { const p = await this.prisma.product.findFirst({ where: { id, organisationId: org }, select: { id: true } }); if (!p) throw new NotFoundException('Product not found.'); }
  private optionalText(value: unknown, max: number): string { if (value === undefined || value === null) return ''; if (typeof value !== 'string' || value.length > max) throw new BadRequestException(`Text must be no longer than ${max} characters.`); return value.trim(); }
  private date(value: unknown): Date | null { if (value === undefined || value === null || value === '') return null; if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) throw new BadRequestException('Date must be a valid ISO date.'); return new Date(value); }
}
