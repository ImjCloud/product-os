import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AuthenticatedRequest, OrganisationGuard } from '../auth/organisation.guard';
import { assertCanWrite } from '../auth/roles';
import { createReleaseSchema, updateReleaseSchema, checkSchema } from './releases.schemas';
import { z } from 'zod';
const deploymentCreateSchema = z.object({ environment: z.enum(['DEVELOPMENT','TEST','STAGING','PRODUCTION']), plannedAt: z.string().datetime().optional(), deployedBy: z.string().trim().max(160).optional(), rollbackPlan: z.string().max(10000).optional() }).strict();
const deploymentUpdateSchema = z.object({ status: z.enum(['IN_PROGRESS','SUCCEEDED','FAILED','ROLLED_BACK']).optional(), deployedBy: z.string().trim().max(160).optional(), rollbackPlan: z.string().max(10000).optional(), verificationNotes: z.string().max(10000).optional(), failureReason: z.string().max(10000).optional() }).strict();
const decisionSchema = z.object({ decision: z.enum(['GO','NO_GO','CONDITIONAL_GO']), note: z.string().trim().min(3).max(2000), owner: z.string().trim().max(160).optional() }).strict();
const DEFAULT_CHECKS = [
  ['requirements-approved','Requirements approved'], ['development-complete','Development complete'], ['qa-passed','QA and regression passed'],
  ['uat-signed-off','UAT signed off'], ['security-reviewed','Security review completed'], ['documentation-ready','Documentation and support ready'],
  ['rollback-ready','Rollback plan ready'], ['stakeholders-informed','Stakeholders informed'],
] as const;
function parse(schema: any, body: unknown) { const p = schema.safeParse(body); if (!p.success) throw new BadRequestException(p.error.flatten()); return p.data; }
@Controller()
@UseGuards(OrganisationGuard)
export class ReleasesController {
  constructor(private readonly prisma: PrismaService) {}
  @Get('products/:productId/releases') async list(@Req() req: AuthenticatedRequest, @Param('productId') productId: string) {
    const org = req.organisationMembership!.organisationId;
    await this.assertProduct(productId, org);
    return this.prisma.release.findMany({ where: { productId, organisationId: org }, include: { checks: true, _count: { select: { requirements: true, metrics: true } } }, orderBy: [{ targetDate: 'asc' }, { createdAt: 'desc' }] });
  }
  @Post('products/:productId/releases') async create(@Req() req: AuthenticatedRequest, @Param('productId') productId: string, @Body() body: unknown) {
    assertCanWrite(req); const org = req.organisationMembership!.organisationId; await this.assertProduct(productId, org); const data = parse(createReleaseSchema, body);
    return this.prisma.$transaction(async tx => {
      const release = await tx.release.create({ data: { organisationId: org, productId, version: data.version, targetDate: data.targetDate ? new Date(data.targetDate) : null } });
      await tx.releaseCheck.createMany({ data: DEFAULT_CHECKS.map(([key,label]) => ({ releaseId: release.id, key, label })) });
      await tx.auditLog.create({ data: { organisationId: org, actorUserId: req.organisationMembership!.userId, entityType: 'Release', entityId: release.id, action: 'CREATED', after: release as unknown as Prisma.InputJsonValue } });
      return tx.release.findUnique({ where: { id: release.id }, include: { checks: true } });
    });
  }
  @Get('releases/:releaseId/readiness') async readiness(@Req() req: AuthenticatedRequest, @Param('releaseId') id: string) {
    const org = req.organisationMembership!.organisationId; const release = await this.prisma.release.findFirst({ where: { id, organisationId: org }, include: { checks: true, requirements: { select: { id: true, title: true, status: true } } } });
    if (!release) throw new NotFoundException('Release not found.');
    const total = release.checks.length; const completed = release.checks.filter(c => c.completed).length; const outstanding = release.checks.filter(c => !c.completed);
    const shippedOrInBuild = release.requirements.filter(r => r.status === 'SHIPPED' || r.status === 'IN_BUILD').length;
    return { releaseId: id, version: release.version, status: release.status, checks: { total, completed, outstanding }, completionPercent: total ? Math.round(completed / total * 100) : 0, requirements: { total: release.requirements.length, inBuildOrShipped: shippedOrInBuild }, canMarkReady: total > 0 && completed === total };
  }
  @Patch('releases/:releaseId') async update(@Req() req: AuthenticatedRequest, @Param('releaseId') id: string, @Body() body: unknown) {
    assertCanWrite(req); const org = req.organisationMembership!.organisationId; const data = parse(updateReleaseSchema, body);
    const before = await this.prisma.release.findFirst({ where: { id, organisationId: org }, include: { checks: true } }); if (!before) throw new NotFoundException('Release not found.');
    if (data.status === 'READY' && (before.checks.length === 0 || before.checks.some(c => !c.completed))) throw new BadRequestException('Complete all release checks before marking it READY.'); if (data.status === 'RELEASED' && before.status !== 'READY') throw new BadRequestException('A release must be READY before it can be marked RELEASED.');
    const updated = await this.prisma.$transaction(async tx => { const result = await tx.release.update({ where: { id }, data: { ...data, targetDate: data.targetDate === undefined ? undefined : data.targetDate ? new Date(data.targetDate) : null }, include: { checks: true } }); await tx.auditLog.create({ data: { organisationId: org, actorUserId: req.organisationMembership!.userId, entityType: 'Release', entityId: id, action: 'UPDATED', before: before as unknown as Prisma.InputJsonValue, after: result as unknown as Prisma.InputJsonValue } }); if (data.status === 'RELEASED' && before.status !== 'RELEASED') { const recipients = await tx.membership.findMany({ where: { organisationId: org, userId: { not: req.organisationMembership!.userId } }, select: { userId: true } }); if (recipients.length) await tx.notification.createMany({ data: recipients.map(member => ({ organisationId: org, userId: member.userId, type: 'RELEASED', title: `Release ${result.version} has shipped`, body: `The release was marked as released by a workspace member.`, entityType: 'Release', entityId: id })) }); } return result; });
    return updated;
  }
  @Post('releases/:releaseId/decisions') async addDecision(@Req() req: AuthenticatedRequest, @Param('releaseId') id: string, @Body() body: unknown) {
    assertCanWrite(req); const org = req.organisationMembership!.organisationId; const parsed = decisionSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    const before = await this.prisma.release.findFirst({ where: { id, organisationId: org } });
    if (!before) throw new NotFoundException('Release not found.');
    const prior = Array.isArray(before.decisionLog) ? before.decisionLog as unknown[] : [];
    const entry = { ...parsed.data, byUserId: req.organisationMembership!.userId, at: new Date().toISOString() };
    const updated = await this.prisma.$transaction(async tx => {
      const result = await tx.release.update({ where: { id }, data: { decisionLog: [...prior, entry] as Prisma.InputJsonValue } });
      await tx.auditLog.create({ data: { organisationId: org, actorUserId: req.organisationMembership!.userId, entityType: 'Release', entityId: id, action: 'DECISION_RECORDED', before: before as unknown as Prisma.InputJsonValue, after: result as unknown as Prisma.InputJsonValue } });
      const recipients = await tx.membership.findMany({ where: { organisationId: org, userId: { not: req.organisationMembership!.userId } }, select: { userId: true } });
      if (recipients.length) await tx.notification.createMany({ data: recipients.map(member => ({ organisationId: org, userId: member.userId, type: 'RELEASE_DECISION', title: `Release decision: ${parsed.data.decision.replaceAll('_',' ')}`, body: `${before.version}: ${parsed.data.note}`, entityType: 'Release', entityId: id })) });
      return result;
    });
    return { releaseId: id, decision: entry, decisionLog: updated.decisionLog };
  }
  @Patch('releases/:releaseId/checks/:checkId') async updateCheck(@Req() req: AuthenticatedRequest, @Param('releaseId') releaseId: string, @Param('checkId') checkId: string, @Body() body: unknown) {
    assertCanWrite(req); const org = req.organisationMembership!.organisationId; const data = parse(checkSchema, body);
    const release = await this.prisma.release.findFirst({ where: { id: releaseId, organisationId: org }, select: { id: true } }); if (!release) throw new NotFoundException('Release not found.');
    const releaseState = await this.prisma.release.findFirst({ where: { id: releaseId, organisationId: org }, select: { status: true } }); if (releaseState?.status !== 'PLANNING') throw new BadRequestException('Checklist is locked once a release reaches READY. Return the release to PLANNING before changing checks.'); const check = await this.prisma.releaseCheck.findFirst({ where: { id: checkId, releaseId } }); if (!check) throw new NotFoundException('Release check not found.');
    return this.prisma.$transaction(async tx => { const updated = await tx.releaseCheck.update({ where: { id: checkId }, data: { completed: data.completed } }); await tx.auditLog.create({ data: { organisationId: org, actorUserId: req.organisationMembership!.userId, entityType: 'ReleaseCheck', entityId: checkId, action: 'UPDATED', before: check as unknown as Prisma.InputJsonValue, after: updated as unknown as Prisma.InputJsonValue } }); return updated; });
  }
  @Get('products/:productId/deployments') async listDeployments(@Req() req: AuthenticatedRequest, @Param('productId') productId: string) {
    const org = req.organisationMembership!.organisationId; await this.assertProduct(productId, org);
    return this.prisma.deployment.findMany({ where: { productId, organisationId: org }, include: { release: { select: { id: true, version: true, status: true } } }, orderBy: [{ createdAt: 'desc' }] });
  }
  @Post('releases/:releaseId/deployments') async createDeployment(@Req() req: AuthenticatedRequest, @Param('releaseId') releaseId: string, @Body() body: unknown) {
    assertCanWrite(req); const org = req.organisationMembership!.organisationId; const data = parse(deploymentCreateSchema, body);
    const release = await this.prisma.release.findFirst({ where: { id: releaseId, organisationId: org }, select: { id: true, productId: true, version: true, status: true } });
    if (!release) throw new NotFoundException('Release not found.');
    if (release.status !== 'READY') throw new BadRequestException('A release must pass its readiness checks before a deployment can be planned.');
    const created = await this.prisma.$transaction(async tx => {
      const deployment = await tx.deployment.create({ data: { organisationId: org, productId: release.productId, releaseId, environment: data.environment, plannedAt: data.plannedAt ? new Date(data.plannedAt) : null, deployedBy: data.deployedBy || '', rollbackPlan: data.rollbackPlan || '', versionLabel: release.version } });
      await tx.auditLog.create({ data: { organisationId: org, actorUserId: req.organisationMembership!.userId, entityType: 'Deployment', entityId: deployment.id, action: 'CREATED', after: deployment as unknown as Prisma.InputJsonValue } });
      return tx.deployment.findUnique({ where: { id: deployment.id }, include: { release: { select: { id: true, version: true, status: true } } } });
    }); return created;
  }
  @Patch('deployments/:deploymentId') async updateDeployment(@Req() req: AuthenticatedRequest, @Param('deploymentId') id: string, @Body() body: unknown) {
    assertCanWrite(req); const org = req.organisationMembership!.organisationId; const data = parse(deploymentUpdateSchema, body);
    const before = await this.prisma.deployment.findFirst({ where: { id, organisationId: org } }); if (!before) throw new NotFoundException('Deployment not found.');
    const next = data.status; if (next) {
      const allowed: Record<string, string[]> = { PLANNED: ['IN_PROGRESS'], IN_PROGRESS: ['SUCCEEDED','FAILED'], FAILED: [], SUCCEEDED: ['ROLLED_BACK'], ROLLED_BACK: [] };
      if (!allowed[before.status]?.includes(next)) throw new BadRequestException(`Cannot change deployment from ${before.status} to ${next}.`);
      if (next === 'SUCCEEDED' && !String(data.verificationNotes ?? before.verificationNotes).trim()) throw new BadRequestException('Add post-deployment verification notes before marking a deployment successful.');
      if (next === 'FAILED' && !String(data.failureReason ?? '').trim()) throw new BadRequestException('A failure reason is required.');
      if (next === 'ROLLED_BACK' && !String(before.rollbackPlan).trim()) throw new BadRequestException('A rollback plan must be recorded before marking a deployment rolled back.');
    }
    const updated = await this.prisma.$transaction(async tx => {
      const result = await tx.deployment.update({ where: { id }, data: { ...data, startedAt: next === 'IN_PROGRESS' ? new Date() : undefined, completedAt: next === 'IN_PROGRESS' ? null : ['SUCCEEDED','FAILED','ROLLED_BACK'].includes(next || '') ? new Date() : undefined } });
      await tx.auditLog.create({ data: { organisationId: org, actorUserId: req.organisationMembership!.userId, entityType: 'Deployment', entityId: id, action: next ? `STATUS_${next}` : 'UPDATED', before: before as unknown as Prisma.InputJsonValue, after: result as unknown as Prisma.InputJsonValue } });
      return tx.deployment.findUnique({ where: { id }, include: { release: { select: { id: true, version: true, status: true } } } });
    }); return updated;
  }
  private async assertProduct(id: string, org: string) { const p = await this.prisma.product.findFirst({ where: { id, organisationId: org }, select: { id: true } }); if (!p) throw new NotFoundException('Product not found.'); }
}
