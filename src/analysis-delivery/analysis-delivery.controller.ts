import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AuthenticatedRequest, OrganisationGuard } from '../auth/organisation.guard';
import { assertCanWrite } from '../auth/roles';
import { z } from 'zod';

const CONFIG = {
  'process-analyses': { model: 'processAnalysis', entity: 'ProcessAnalysis', fields: ['title','purpose','scope','asIs','toBe','gapAnalysis','assumptions','ownerLabel','status','initiativeId'], statuses: ['DRAFT','IN_REVIEW','APPROVED','ARCHIVED'] },
  'test-cases': { model: 'testCase', entity: 'TestCase', fields: ['key','title','objective','preconditions','steps','expectedResult','status','ownerLabel','initiativeId','requirementId'], statuses: ['DRAFT','READY','RETIRED'] },
  'benefits': { model: 'benefitMeasure', entity: 'BenefitMeasure', fields: ['title','description','measurementMethod','unit','baselineValue','targetValue','actualValue','baselineDate','targetDate','lastMeasuredAt','ownerLabel','status','initiativeId'], statuses: ['PLANNED','BASELINED','TRACKING','REALISED','NOT_REALISING','CLOSED'] },
} as const;
type Kind = keyof typeof CONFIG;

@Controller('products/:productId/delivery-analysis')
@UseGuards(OrganisationGuard)
export class AnalysisDeliveryController {
  constructor(private readonly prisma: PrismaService) {}

  // Read-only, product-scoped assurance view. It joins existing native records without
  // creating a second generic task/relationship model or changing stored data.
  @Get('assurance') async assurance(@Req() req: AuthenticatedRequest, @Param('productId') productId: string) {
    const org = req.organisationMembership!.organisationId;
    await this.assertProduct(productId, org);
    const [requirements, testCases, executions, releases, risks, issues, dependencies, changes, benefits, processes] = await Promise.all([
      this.prisma.requirement.findMany({ where: { organisationId: org, productId }, select: { id: true, title: true, status: true, initiativeId: true, releaseId: true, updatedAt: true }, orderBy: { updatedAt: 'desc' } }),
      this.prisma.testCase.findMany({ where: { organisationId: org, productId }, select: { id: true, key: true, title: true, status: true, requirementId: true } }),
      this.prisma.testExecution.findMany({ where: { organisationId: org, productId }, select: { id: true, testCaseId: true, status: true, executedAt: true, defectReference: true }, orderBy: { executedAt: 'desc' } }),
      this.prisma.release.findMany({ where: { organisationId: org, productId }, select: { id: true, version: true, status: true, targetDate: true, checks: { select: { completed: true } } }, orderBy: { targetDate: 'asc' } }),
      this.prisma.risk.findMany({ where: { organisationId: org, productId }, select: { id: true, title: true, status: true, probability: true, impact: true, reviewDate: true, initiativeId: true } }),
      this.prisma.issue.findMany({ where: { organisationId: org, productId }, select: { id: true, title: true, status: true, severity: true, dueAt: true, initiativeId: true } }),
      this.prisma.dependency.findMany({ where: { organisationId: org, productId }, select: { id: true, title: true, status: true, neededBy: true, initiativeId: true } }),
      this.prisma.changeRequest.findMany({ where: { organisationId: org, productId }, select: { id: true, title: true, status: true, initiativeId: true } }),
      this.prisma.benefitMeasure.findMany({ where: { organisationId: org, productId }, select: { id: true, title: true, status: true, baselineValue: true, targetValue: true, actualValue: true, lastMeasuredAt: true, initiativeId: true } }),
      this.prisma.processAnalysis.findMany({ where: { organisationId: org, productId }, select: { id: true, title: true, status: true, initiativeId: true } }),
    ]);
    const latestExecution = new Map<string, typeof executions[number]>();
    for (const execution of executions) if (!latestExecution.has(execution.testCaseId)) latestExecution.set(execution.testCaseId, execution);
    const testCasesWithLatest = testCases.map(test => ({ ...test, latestExecution: latestExecution.get(test.id) ?? null }));
    const linkedTests = new Map<string, number>();
    for (const test of testCases) if (test.requirementId) linkedTests.set(test.requirementId, (linkedTests.get(test.requirementId) ?? 0) + 1);
    const requirementsWithCoverage = requirements.map(requirement => ({ ...requirement, testCaseCount: linkedTests.get(requirement.id) ?? 0, coveredByTest: (linkedTests.get(requirement.id) ?? 0) > 0 }));
    const now = new Date();
    const overdue = (date: Date | null) => !!date && date < now;
    const releaseReadiness = releases.map(release => { const total = release.checks.length; const completed = release.checks.filter(check => check.completed).length; return { id: release.id, version: release.version, status: release.status, targetDate: release.targetDate, checksTotal: total, checksCompleted: completed, completionPercent: total ? Math.round(completed / total * 100) : 0, overdue: overdue(release.targetDate) && release.status !== 'RELEASED' }; });
    const counts = {
      requirements: requirements.length,
      requirementsWithoutTests: requirementsWithCoverage.filter(item => !item.coveredByTest).length,
      testCases: testCases.length,
      testsPassed: testCasesWithLatest.filter(item => item.latestExecution?.status === 'PASSED').length,
      testsFailed: testCasesWithLatest.filter(item => item.latestExecution?.status === 'FAILED').length,
      testsBlocked: testCasesWithLatest.filter(item => item.latestExecution?.status === 'BLOCKED').length,
      risksOpen: risks.filter(item => item.status !== 'CLOSED' && item.status !== 'ACCEPTED').length,
      issuesOpen: issues.filter(item => !['RESOLVED','CLOSED'].includes(item.status)).length,
      dependenciesOpen: dependencies.filter(item => !['RESOLVED'].includes(item.status)).length,
      changesAwaitingDecision: changes.filter(item => ['SUBMITTED','UNDER_REVIEW'].includes(item.status)).length,
      benefitsTracking: benefits.filter(item => ['TRACKING','NOT_REALISING'].includes(item.status)).length,
      processesAwaitingApproval: processes.filter(item => item.status === 'IN_REVIEW').length,
    };
    return { productId, generatedAt: now.toISOString(), counts, requirements: requirementsWithCoverage, testCases: testCasesWithLatest, latestExecutions: executions, releases: releaseReadiness, risks, issues, dependencies, changeRequests: changes, benefits, processAnalyses: processes };
  }

  @Get('initiative-command/:initiativeId') async initiativeCommand(@Req() req: AuthenticatedRequest, @Param('productId') productId: string, @Param('initiativeId') initiativeId: string) {
    const org = req.organisationMembership!.organisationId;
    await this.assertProduct(productId, org);
    const initiative = await this.prisma.initiative.findFirst({ where: { id: initiativeId, organisationId: org, productId }, include: { milestones: { orderBy: { sortOrder: 'asc' } } } });
    if (!initiative) throw new NotFoundException('Initiative not found.');
    const base = { organisationId: org, productId, initiativeId };
    const [requirements, actions, decisions, risks, dependencies, stakeholders, issues, changes, processes, testCases, benefits, evidence] = await Promise.all([
      this.prisma.requirement.findMany({ where: base, select: { id: true, title: true, status: true, owner: true, releaseId: true, updatedAt: true }, orderBy: { updatedAt: 'desc' } }),
      this.prisma.actionItem.findMany({ where: base, select: { id: true, title: true, status: true, priority: true, assigneeLabel: true, dueAt: true }, orderBy: [{ dueAt: 'asc' }, { updatedAt: 'desc' }] }),
      this.prisma.decision.findMany({ where: base, select: { id: true, title: true, status: true, ownerLabel: true, rationale: true, decidedAt: true }, orderBy: { updatedAt: 'desc' } }),
      this.prisma.risk.findMany({ where: base, select: { id: true, title: true, status: true, probability: true, impact: true, ownerLabel: true, reviewDate: true }, orderBy: { updatedAt: 'desc' } }),
      this.prisma.dependency.findMany({ where: base, select: { id: true, title: true, status: true, dependsOn: true, ownerLabel: true, neededBy: true }, orderBy: { neededBy: 'asc' } }),
      this.prisma.stakeholder.findMany({ where: base, select: { id: true, name: true, role: true, engagement: true, influence: true, engagementLogs: { orderBy: { occurredAt: 'desc' }, take: 1, select: { occurredAt: true, outcome: true, nextAction: true, followUpAt: true } } }, orderBy: { influence: 'desc' } }),
      this.prisma.issue.findMany({ where: base, select: { id: true, title: true, status: true, severity: true, ownerLabel: true, dueAt: true }, orderBy: { updatedAt: 'desc' } }),
      this.prisma.changeRequest.findMany({ where: base, select: { id: true, title: true, status: true, ownerLabel: true, reviewedAt: true }, orderBy: { updatedAt: 'desc' } }),
      this.prisma.processAnalysis.findMany({ where: base, select: { id: true, title: true, status: true, ownerLabel: true, updatedAt: true }, orderBy: { updatedAt: 'desc' } }),
      this.prisma.testCase.findMany({ where: base, select: { id: true, key: true, title: true, status: true, requirementId: true, executions: { orderBy: { executedAt: 'desc' }, take: 1, select: { status: true, executedAt: true, defectReference: true } } }, orderBy: { updatedAt: 'desc' } }),
      this.prisma.benefitMeasure.findMany({ where: base, select: { id: true, title: true, status: true, unit: true, baselineValue: true, targetValue: true, actualValue: true, lastMeasuredAt: true, measurements: { orderBy: { measuredAt: 'desc' }, take: 6, select: { value: true, measuredAt: true, source: true } } }, orderBy: { updatedAt: 'desc' } }),
      this.prisma.evidenceItem.findMany({ where: { organisationId: org, productId, initiativeId }, select: { id: true, title: true, evidenceType: true, targetType: true, targetId: true, verificationStatus: true, sourceUrl: true, referenceCode: true, createdAt: true }, orderBy: { createdAt: 'desc' } }),
    ]);
    const now = new Date();
    const openActions = actions.filter(x => x.status !== 'DONE');
    const overdueActions = openActions.filter(x => x.dueAt && x.dueAt < now);
    const openRisks = risks.filter(x => !['CLOSED', 'ACCEPTED'].includes(x.status));
    const openIssues = issues.filter(x => !['RESOLVED', 'CLOSED'].includes(x.status));
    const openDependencies = dependencies.filter(x => x.status !== 'RESOLVED');
    const tests = testCases.reduce((acc, x) => { const status = x.executions[0]?.status || 'NOT_RUN'; acc[status] = (acc[status] || 0) + 1; return acc; }, {} as Record<string, number>);
    return { generatedAt: now.toISOString(), initiative, counts: { requirements: requirements.length, actions: actions.length, actionsOpen: openActions.length, actionsOverdue: overdueActions.length, decisions: decisions.length, decisionsPending: decisions.filter(x => ['PROPOSED', 'DEFERRED'].includes(x.status)).length, risksOpen: openRisks.length, issuesOpen: openIssues.length, dependenciesOpen: openDependencies.length, stakeholders: stakeholders.length, changesPending: changes.filter(x => ['SUBMITTED', 'UNDER_REVIEW'].includes(x.status)).length, processes: processes.length, testCases: testCases.length, benefits: benefits.length, evidence: evidence.length, evidenceUnverified: evidence.filter(x => x.verificationStatus === 'UNVERIFIED').length }, testResults: tests, requirements, actions, decisions, risks, dependencies, stakeholders, issues, changes, processes, testCases, benefits, evidence };
  }

  @Get('traceability') async traceability(@Req() req: AuthenticatedRequest, @Param('productId') productId: string) {
    const org = req.organisationMembership!.organisationId;
    await this.assertProduct(productId, org);
    const [requirements, feedback, actions, decisions, risks, dependencies, testCases, releases, initiatives] = await Promise.all([
      this.prisma.requirement.findMany({ where: { organisationId: org, productId }, include: { feedback: { select: { id: true, text: true, status: true } }, actionItems: { select: { id: true, title: true, status: true } }, testCases: { select: { id: true, key: true, title: true, status: true, executions: { orderBy: { executedAt: 'desc' }, take: 1, select: { status: true, executedAt: true, defectReference: true } } } }, release: { select: { id: true, version: true, status: true } }, initiative: { select: { id: true, name: true, status: true } } }, orderBy: { updatedAt: 'desc' } }),
      this.prisma.feedback.findMany({ where: { organisationId: org, productId }, select: { id: true, text: true, status: true, requirementId: true } }),
      this.prisma.actionItem.findMany({ where: { organisationId: org, productId }, select: { id: true, title: true, status: true, requirementId: true, feedbackId: true, releaseId: true, initiativeId: true } }),
      this.prisma.decision.findMany({ where: { organisationId: org, productId }, select: { id: true, title: true, status: true, initiativeId: true } }),
      this.prisma.risk.findMany({ where: { organisationId: org, productId }, select: { id: true, title: true, status: true, initiativeId: true } }),
      this.prisma.dependency.findMany({ where: { organisationId: org, productId }, select: { id: true, title: true, status: true, initiativeId: true } }),
      this.prisma.testCase.findMany({ where: { organisationId: org, productId }, select: { id: true, key: true, title: true, requirementId: true } }),
      this.prisma.release.findMany({ where: { organisationId: org, productId }, select: { id: true, version: true, status: true, targetDate: true } }),
      this.prisma.initiative.findMany({ where: { organisationId: org, productId }, select: { id: true, name: true, status: true } }),
    ]);
    const unlinked = {
      feedback: feedback.filter(item => !item.requirementId).length,
      actions: actions.filter(item => !item.requirementId && !item.feedbackId && !item.initiativeId && !item.releaseId).length,
      testCases: testCases.filter(item => !item.requirementId).length,
      decisions: decisions.filter(item => !item.initiativeId).length,
      risks: risks.filter(item => !item.initiativeId).length,
      dependencies: dependencies.filter(item => !item.initiativeId).length,
    };
    return { productId, generatedAt: new Date().toISOString(), summary: { requirements: requirements.length, feedback: feedback.length, actions: actions.length, decisions: decisions.length, risks: risks.length, dependencies: dependencies.length, testCases: testCases.length, releases: releases.length, initiatives: initiatives.length, recordsWithoutPrimaryLink: Object.values(unlinked).reduce((a,b) => a+b,0) }, unlinked, requirements, feedback, actions, decisions, risks, dependencies, testCases, releases, initiatives };
  }
  @Get('uat-cycles') async listUatCycles(@Req() req: AuthenticatedRequest, @Param('productId') productId: string) {
    const org = req.organisationMembership!.organisationId; await this.assertProduct(productId, org);
    return this.prisma.uatCycle.findMany({ where: { organisationId: org, productId }, include: { executions: { include: { testCase: { select: { id: true, key: true, title: true } } }, orderBy: { executedAt: 'desc' } } }, orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }] });
  }
  @Post('uat-cycles') async createUatCycle(@Req() req: AuthenticatedRequest, @Param('productId') productId: string, @Body() body: any) {
    assertCanWrite(req); const org = req.organisationMembership!.organisationId; await this.assertProduct(productId, org);
    const schema = z.object({ name: z.string().trim().min(2).max(160), objective: z.string().max(5000).optional(), startDate: z.string().datetime().nullable().optional(), endDate: z.string().datetime().nullable().optional(), ownerLabel: z.string().max(160).nullable().optional(), participants: z.array(z.string().trim().min(1).max(160)).max(100).optional(), acceptanceCriteria: z.string().max(10000).optional() }).strict();
    const parsed = schema.safeParse(body); if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    if (parsed.data.startDate && parsed.data.endDate && new Date(parsed.data.endDate) < new Date(parsed.data.startDate)) throw new BadRequestException('UAT end date cannot be earlier than its start date.');
    const row = await this.prisma.uatCycle.create({ data: { organisationId: org, productId, ...parsed.data, startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null, endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null, participants: (parsed.data.participants || []) as any } });
    await this.prisma.auditLog.create({ data: { organisationId: org, actorUserId: req.organisationMembership!.userId, entityType: 'UatCycle', entityId: row.id, action: 'CREATED', after: row as Prisma.InputJsonValue } }); return row;
  }
  @Patch('uat-cycles/:cycleId') async updateUatCycle(@Req() req: AuthenticatedRequest, @Param('productId') productId: string, @Param('cycleId') cycleId: string, @Body() body: any) {
    assertCanWrite(req); const org = req.organisationMembership!.organisationId; const before = await this.prisma.uatCycle.findFirst({ where: { id: cycleId, productId, organisationId: org } }); if (!before) throw new NotFoundException('UAT cycle not found.');
    const schema = z.object({ name: z.string().trim().min(2).max(160).optional(), objective: z.string().max(5000).optional(), status: z.enum(['PLANNED','ACTIVE','COMPLETED','CANCELLED']).optional(), startDate: z.string().datetime().nullable().optional(), endDate: z.string().datetime().nullable().optional(), ownerLabel: z.string().max(160).nullable().optional(), participants: z.array(z.string().trim().min(1).max(160)).max(100).optional(), acceptanceCriteria: z.string().max(10000).optional() }).strict().refine(v => Object.keys(v).length > 0);
    const parsed = schema.safeParse(body); if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    const data: any = { ...parsed.data }; if (data.startDate !== undefined) data.startDate = data.startDate ? new Date(data.startDate) : null; if (data.endDate !== undefined) data.endDate = data.endDate ? new Date(data.endDate) : null;
    if (data.participants) data.participants = data.participants as any;
    const row = await this.prisma.$transaction(async tx => { const updated = await tx.uatCycle.update({ where: { id: cycleId }, data }); await tx.auditLog.create({ data: { organisationId: org, actorUserId: req.organisationMembership!.userId, entityType: 'UatCycle', entityId: cycleId, action: 'UPDATED', before: before as Prisma.InputJsonValue, after: updated as Prisma.InputJsonValue } }); return updated; }); return row;
  }
  @Post('uat-cycles/:cycleId/sign-off') async signOffUat(@Req() req: AuthenticatedRequest, @Param('productId') productId: string, @Param('cycleId') cycleId: string, @Body() body: any) {
    assertCanWrite(req); const org = req.organisationMembership!.organisationId; const before = await this.prisma.uatCycle.findFirst({ where: { id: cycleId, productId, organisationId: org } }); if (!before) throw new NotFoundException('UAT cycle not found.');
    const parsed = z.object({ decision: z.enum(['ACCEPTED','REJECTED','CONDITIONAL']), notes: z.string().trim().min(3).max(5000) }).strict().safeParse(body); if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    const result = await this.prisma.$transaction(async tx => { const row = await tx.uatCycle.update({ where: { id: cycleId }, data: { signOffStatus: parsed.data.decision, signOffBy: req.organisationMembership!.userId, signOffAt: new Date(), signOffNotes: parsed.data.notes, status: parsed.data.decision === 'ACCEPTED' ? 'COMPLETED' : 'ACTIVE' } }); await tx.auditLog.create({ data: { organisationId: org, actorUserId: req.organisationMembership!.userId, entityType: 'UatCycle', entityId: cycleId, action: `UAT_${parsed.data.decision}`, before: before as Prisma.InputJsonValue, after: row as Prisma.InputJsonValue } }); return row; }); return result;
  }
  @Get('benefit-intelligence') async benefitIntelligence(@Req() req: AuthenticatedRequest, @Param('productId') productId: string) {
    const org = req.organisationMembership!.organisationId; await this.assertProduct(productId, org);
    const measures = await this.prisma.benefitMeasure.findMany({ where: { organisationId: org, productId }, include: { initiative: { select: { id: true, name: true } }, measurements: { orderBy: { measuredAt: 'asc' }, take: 100, select: { id: true, value: true, measuredAt: true, source: true, notes: true } } }, orderBy: { updatedAt: 'desc' } });
    const items = measures.map(measure => {
      const hasComparableRange = measure.baselineValue !== null && measure.targetValue !== null && measure.targetValue !== measure.baselineValue && measure.actualValue !== null;
      const progressPercent = hasComparableRange ? ((measure.actualValue! - measure.baselineValue!) / (measure.targetValue! - measure.baselineValue!)) * 100 : null;
      const varianceFromTarget = measure.actualValue !== null && measure.targetValue !== null ? measure.actualValue - measure.targetValue : null;
      return { id: measure.id, title: measure.title, unit: measure.unit, status: measure.status, ownerLabel: measure.ownerLabel, initiative: measure.initiative, baselineValue: measure.baselineValue, targetValue: measure.targetValue, actualValue: measure.actualValue, lastMeasuredAt: measure.lastMeasuredAt, progressPercent: progressPercent === null ? null : Math.round(progressPercent * 10) / 10, varianceFromTarget, measurementCount: measure.measurements.length, measurements: measure.measurements };
    });
    return { productId, generatedAt: new Date().toISOString(), summary: { total: items.length, tracking: items.filter(x => x.status === 'TRACKING').length, notRealising: items.filter(x => x.status === 'NOT_REALISING').length, realised: items.filter(x => x.status === 'REALISED').length, withoutBaseline: items.filter(x => x.baselineValue === null).length, withoutTarget: items.filter(x => x.targetValue === null).length, withoutMeasurement: items.filter(x => x.actualValue === null).length }, items };
  }
  @Get('benefits/:benefitId/measurements') async listBenefitMeasurements(@Req() req: AuthenticatedRequest, @Param('productId') productId: string, @Param('benefitId') benefitId: string) {
    const org = req.organisationMembership!.organisationId; const benefit = await this.prisma.benefitMeasure.findFirst({ where: { id: benefitId, productId, organisationId: org } }); if (!benefit) throw new NotFoundException('Benefit measure not found.');
    return this.prisma.benefitMeasurement.findMany({ where: { benefitMeasureId: benefitId, productId, organisationId: org }, orderBy: { measuredAt: 'desc' } });
  }
  @Post('benefits/:benefitId/measurements') async recordBenefitMeasurement(@Req() req: AuthenticatedRequest, @Param('productId') productId: string, @Param('benefitId') benefitId: string, @Body() body: any) {
    assertCanWrite(req); const org = req.organisationMembership!.organisationId; const benefit = await this.prisma.benefitMeasure.findFirst({ where: { id: benefitId, productId, organisationId: org } }); if (!benefit) throw new NotFoundException('Benefit measure not found.');
    const parsed = z.object({ value: z.number().finite(), measuredAt: z.string().datetime().optional(), source: z.string().max(300).optional(), notes: z.string().max(5000).optional() }).strict().safeParse(body); if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    const measuredAt = parsed.data.measuredAt ? new Date(parsed.data.measuredAt) : new Date();
    const row = await this.prisma.$transaction(async tx => { const measurement = await tx.benefitMeasurement.create({ data: { organisationId: org, productId, benefitMeasureId: benefitId, value: parsed.data.value, measuredAt, source: parsed.data.source || '', notes: parsed.data.notes || '', recordedBy: req.organisationMembership!.userId } }); await tx.benefitMeasure.update({ where: { id: benefitId }, data: { actualValue: parsed.data.value, lastMeasuredAt: measuredAt, status: benefit.status === 'PLANNED' || benefit.status === 'BASELINED' ? 'TRACKING' : undefined } }); await tx.auditLog.create({ data: { organisationId: org, actorUserId: req.organisationMembership!.userId, entityType: 'BenefitMeasurement', entityId: measurement.id, action: 'RECORDED', after: measurement as Prisma.InputJsonValue } }); return measurement; }); return row;
  }
  @Get(':kind') async list(@Req() req: AuthenticatedRequest, @Param('productId') productId: string, @Param('kind') kind: string) {
    const c = this.config(kind); const org = req.organisationMembership!.organisationId; await this.assertProduct(productId, org);
    return (this.prisma as any)[c.model].findMany({ where: { organisationId: org, productId }, include: kind === 'test-cases' ? { requirement: { select: { id: true, title: true } }, executions: { orderBy: { executedAt: 'desc' }, take: 5 } } : undefined, orderBy: { updatedAt: 'desc' } });
  }
  @Post(':kind') async create(@Req() req: AuthenticatedRequest, @Param('productId') productId: string, @Param('kind') kind: string, @Body() body: any) {
    assertCanWrite(req); const c = this.config(kind); const org = req.organisationMembership!.organisationId; await this.assertProduct(productId, org); const data = this.clean(c, body, true); await this.assertLinks(data, kind, productId, org);
    return this.prisma.$transaction(async tx => { const row = await (tx as any)[c.model].create({ data: { ...data, organisationId: org, productId } }); await tx.auditLog.create({ data: { organisationId: org, actorUserId: req.organisationMembership!.userId, entityType: c.entity, entityId: row.id, action: 'CREATED', after: row as Prisma.InputJsonValue } }); return row; });
  }
  @Patch(':kind/:id') async update(@Req() req: AuthenticatedRequest, @Param('productId') productId: string, @Param('kind') kind: string, @Param('id') id: string, @Body() body: any) {
    assertCanWrite(req); const c = this.config(kind); const org = req.organisationMembership!.organisationId; const delegate = (this.prisma as any)[c.model]; const before = await delegate.findFirst({ where: { id, organisationId: org, productId } }); if (!before) throw new NotFoundException('Record not found.'); const data = this.clean(c, body, false); await this.assertLinks(data, kind, productId, org);
    return this.prisma.$transaction(async tx => { const row = await (tx as any)[c.model].update({ where: { id }, data }); await tx.auditLog.create({ data: { organisationId: org, actorUserId: req.organisationMembership!.userId, entityType: c.entity, entityId: id, action: 'UPDATED', before: before as Prisma.InputJsonValue, after: row as Prisma.InputJsonValue } }); return row; });
  }
  @Post('test-cases/:id/executions') async execute(@Req() req: AuthenticatedRequest, @Param('productId') productId: string, @Param('id') id: string, @Body() body: any) {
    assertCanWrite(req); const org = req.organisationMembership!.organisationId; await this.assertProduct(productId, org); const test = await this.prisma.testCase.findFirst({ where: { id, organisationId: org, productId } }); if (!test) throw new NotFoundException('Test case not found.');
    const allowed = ['PASSED','FAILED','BLOCKED','NOT_RUN']; if (!allowed.includes(body?.status)) throw new BadRequestException('Choose a valid execution outcome.');
    if (body?.uatCycleId && !await this.prisma.uatCycle.findFirst({ where: { id: body.uatCycleId, organisationId: org, productId } })) throw new BadRequestException('UAT cycle must belong to this product and organisation.');
    for (const f of ['actualResult','evidenceUrl','defectReference','executedBy','notes']) if (body[f] !== undefined && (typeof body[f] !== 'string' || body[f].length > 5000)) throw new BadRequestException(`Invalid ${f}.`);
    return this.prisma.$transaction(async tx => { const row = await tx.testExecution.create({ data: { organisationId: org, productId, testCaseId: id, uatCycleId: body.uatCycleId || null, status: body.status, actualResult: body.actualResult ?? '', evidenceUrl: body.evidenceUrl || null, defectReference: body.defectReference || null, executedBy: body.executedBy || null, notes: body.notes ?? '' } }); await tx.auditLog.create({ data: { organisationId: org, actorUserId: req.organisationMembership!.userId, entityType: 'TestExecution', entityId: row.id, action: 'EXECUTED', after: row as Prisma.InputJsonValue } }); return row; });
  }
  private config(kind: string) { if (!(kind in CONFIG)) throw new NotFoundException('Delivery analysis register not found.'); return CONFIG[kind as Kind]; }
  private async assertProduct(productId: string, org: string) { if (!await this.prisma.product.findFirst({ where: { id: productId, organisationId: org }, select: { id: true } })) throw new NotFoundException('Product not found.'); }
  private async assertLinks(data: Record<string, any>, kind: string, productId: string, org: string) {
    if (data.initiativeId && !await this.prisma.initiative.findFirst({ where: { id: data.initiativeId, productId, organisationId: org }, select: { id: true } })) throw new BadRequestException('Initiative must belong to this product and organisation.');
    if (kind === 'test-cases' && data.requirementId && !await this.prisma.requirement.findFirst({ where: { id: data.requirementId, productId, organisationId: org }, select: { id: true } })) throw new BadRequestException('Requirement must belong to this product and organisation.');
  }
  private clean(c: (typeof CONFIG)[Kind], body: any, creating: boolean) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new BadRequestException('A record body is required.'); const data: Record<string, any> = {};
    for (const f of c.fields) { if (!(f in body)) continue; const v = body[f];
      if (f === 'status') { if (!(c.statuses as readonly unknown[]).includes(v)) throw new BadRequestException('Invalid status.'); data[f] = v; continue; }
      if (['baselineValue','targetValue','actualValue'].includes(f)) { if (v === null || v === '') { data[f] = null; continue; } if (typeof v !== 'number' || !Number.isFinite(v)) throw new BadRequestException(`${f} must be a finite number.`); data[f] = v; continue; }
      if (['baselineDate','targetDate','lastMeasuredAt'].includes(f)) { if (!v) { data[f] = null; continue; } if (typeof v !== 'string' || Number.isNaN(Date.parse(v))) throw new BadRequestException(`${f} must be a valid date.`); data[f] = new Date(v); continue; }
      if (f === 'steps') { if (!Array.isArray(v) || v.length > 50 || v.some(x => typeof x !== 'string' || x.length > 1000)) throw new BadRequestException('Steps must be up to 50 text entries.'); data[f] = v.map(x => x.trim()); continue; }
      if (v === null && ['initiativeId','requirementId','ownerLabel'].includes(f)) { data[f] = null; continue; }
      if (typeof v !== 'string' || v.length > (f === 'title' ? 180 : 10000)) throw new BadRequestException(`Invalid ${f}.`); if (['title','key'].includes(f) && !v.trim()) throw new BadRequestException(`${f} is required.`); data[f] = v.trim();
    }
    if (creating && !data.title) throw new BadRequestException('A title is required.'); if (creating && c.model === 'testCase' && !data.key) throw new BadRequestException('A test case key is required.'); return data;
  }
}
