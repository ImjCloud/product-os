import {
  BadRequestException, Body, Controller, Get, NotFoundException, Param,
  Patch, Post, Query, Req, UseGuards,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AuthenticatedRequest, OrganisationGuard } from '../auth/organisation.guard';
import { assertCanWrite } from '../auth/roles';
import { calculateRice } from '../shared/prioritisation';
import { createRequirementSchema, updateRequirementSchema } from './requirements.schemas';

function parse<T>(schema: { safeParse: (value: unknown) => any }, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new BadRequestException({
    message: 'Validation failed.',
    issues: result.error.issues.map((issue: any) => ({ path: issue.path.join('.'), message: issue.message })),
  });
  return result.data as T;
}

function withRiceScore<T extends { reach: number; impact: number; confidence: number; effort: number }>(item: T) {
  return { ...item, riceScore: calculateRice(item) };
}

@Controller()
@UseGuards(OrganisationGuard)
export class RequirementsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('products/:productId/requirements')
  async listRequirements(
    @Req() req: AuthenticatedRequest,
    @Param('productId') productId: string,
    @Query('status') status?: string,
  ) {
    const organisationId = req.organisationMembership!.organisationId;
    await this.assertProductExists(productId, organisationId);
    if (status && !['DISCOVERY', 'SCOPED', 'IN_BUILD', 'SHIPPED'].includes(status)) {
      throw new BadRequestException('Invalid requirement status.');
    }
    const items = await this.prisma.requirement.findMany({
      where: { organisationId, productId, ...(status ? { status: status as any } : {}) },
      include: { initiative: { select: { id: true, name: true } } },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    });
    return items.map(withRiceScore);
  }

  @Get('products/:productId/requirements/quality')
  async getRequirementQuality(@Req() req: AuthenticatedRequest, @Param('productId') productId: string) {
    const organisationId = req.organisationMembership!.organisationId;
    await this.assertProductExists(productId, organisationId);
    const rows = await this.prisma.requirement.findMany({
      where: { organisationId, productId, status: { not: 'SHIPPED' } },
      select: { id: true, title: true, problem: true, userStory: true, acceptance: true, status: true, owner: true, initiativeId: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' }, take: 500,
    });
    const normalise = (value: string) => value.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((word: string) => word.length > 2 && !['the','and','for','with','that','this','from','into'].includes(word));
    const quality = rows.map(row => {
      const checks: { code: string; severity: 'HIGH' | 'MEDIUM' | 'LOW'; message: string }[] = [];
      const title = row.title.trim(); const problem = row.problem.trim(); const story = row.userStory.trim(); const acceptance = row.acceptance.trim();
      if (title.length < 8) checks.push({ code: 'TITLE_TOO_SHORT', severity: 'MEDIUM', message: 'Use a specific title that describes the capability or outcome.' });
      if (!problem || problem.length < 20) checks.push({ code: 'PROBLEM_UNCLEAR', severity: 'HIGH', message: 'Explain the user or business problem and why it matters.' });
      if (!story) checks.push({ code: 'NO_USER_STORY', severity: 'MEDIUM', message: 'Add a user need or an equivalent statement of intended value.' });
      else if (!/\b(as a|as an|when |the user|customer|administrator|operator|system must)\b/i.test(story)) checks.push({ code: 'STORY_CONTEXT', severity: 'LOW', message: 'Clarify who needs this and the outcome they expect.' });
      if (!acceptance || acceptance.length < 15) checks.push({ code: 'NO_ACCEPTANCE_CRITERIA', severity: 'HIGH', message: 'Add observable acceptance criteria before implementation.' });
      else if (/\b(user friendly|fast|easy|intuitive|seamless|etc\.?|and so on|as needed)\b/i.test(acceptance)) checks.push({ code: 'VAGUE_ACCEPTANCE', severity: 'MEDIUM', message: 'Replace subjective wording with observable conditions or measurable thresholds.' });
      if (!row.owner) checks.push({ code: 'NO_OWNER', severity: 'LOW', message: 'Assign an accountable requirement owner.' });
      if (!row.initiativeId) checks.push({ code: 'NOT_LINKED_TO_INITIATIVE', severity: 'LOW', message: 'Consider linking this requirement to an initiative for end-to-end traceability.' });
      const score = Math.max(0, 100 - checks.reduce((sum, item) => sum + (item.severity === 'HIGH' ? 25 : item.severity === 'MEDIUM' ? 12 : 5), 0));
      return { ...row, qualityScore: score, checks };
    });
    const tokenSets = rows.map(row => new Set(normalise(row.title)));
    const possibleDuplicates: any[] = [];
    for (let i = 0; i < rows.length; i++) for (let j = i + 1; j < rows.length; j++) {
      const a = tokenSets[i], b = tokenSets[j]; if (!a.size || !b.size) continue;
      const intersection = [...a].filter(token => b.has(token)).length;
      const similarity = intersection / new Set([...a, ...b]).size;
      if (similarity >= 0.72) possibleDuplicates.push({ first: { id: rows[i].id, title: rows[i].title }, second: { id: rows[j].id, title: rows[j].title }, similarity: Math.round(similarity * 100) });
    }
    return { productId, generatedAt: new Date().toISOString(), summary: { requirementsReviewed: quality.length, averageQualityScore: quality.length ? Math.round(quality.reduce((sum, item) => sum + item.qualityScore, 0) / quality.length) : 0, needsAttention: quality.filter(item => item.checks.some(check => check.severity === 'HIGH')).length, possibleDuplicates: possibleDuplicates.length }, requirements: quality, possibleDuplicates };
  }

  @Get('products/:productId/backlog')
  async getPrioritisedBacklog(@Req() req: AuthenticatedRequest, @Param('productId') productId: string) {
    const organisationId = req.organisationMembership!.organisationId;
    await this.assertProductExists(productId, organisationId);
    const items = await this.prisma.requirement.findMany({
      where: { organisationId, productId, status: { not: 'SHIPPED' } },
      include: { release: { select: { id: true, version: true, status: true, targetDate: true } } },
    });
    return items.map(withRiceScore).sort((a, b) => b.riceScore - a.riceScore || b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  @Post('products/:productId/requirements')
  async createRequirement(@Req() req: AuthenticatedRequest, @Param('productId') productId: string, @Body() body: unknown) {
    assertCanWrite(req);
    const organisationId = req.organisationMembership!.organisationId;
    const data = parse<any>(createRequirementSchema, body);
    await this.assertProductExists(productId, organisationId);
    await this.assertRelease(data.releaseId, productId, organisationId);
    await this.assertInitiative(data.initiativeId, productId, organisationId);
    const requirement = await this.prisma.$transaction(async tx => {
      const created = await tx.requirement.create({ data: {
        organisationId, productId, title: data.title, problem: data.problem ?? '',
        userStory: data.userStory ?? '', acceptance: data.acceptance ?? '',
        status: data.status, owner: data.owner, reach: data.reach ?? 100,
        impact: data.impact ?? 1, confidence: data.confidence ?? 50,
        effort: data.effort ?? 2, releaseId: data.releaseId, initiativeId: data.initiativeId,
      }});
      await tx.auditLog.create({ data: {
        organisationId, actorUserId: req.organisationMembership!.userId,
        entityType: 'Requirement', entityId: created.id, action: 'CREATED',
        after: created as unknown as Prisma.InputJsonValue,
      }});
      return created;
    });
    return withRiceScore(requirement);
  }

  @Post('products/:productId/requirements/bulk-update')
  async bulkUpdate(@Req() req: AuthenticatedRequest, @Param('productId') productId: string, @Body() body: any) {
    assertCanWrite(req); const organisationId = req.organisationMembership!.organisationId; await this.assertProductExists(productId, organisationId);
    const ids = body?.ids; const status = body?.status;
    if (!Array.isArray(ids) || ids.length < 1 || ids.length > 100 || ids.some((id: unknown) => typeof id !== 'string')) throw new BadRequestException('Provide between 1 and 100 requirement IDs.');
    if (!['DISCOVERY','SCOPED','IN_BUILD','SHIPPED'].includes(status)) throw new BadRequestException('Invalid requirement status.');
    const rows = await this.prisma.requirement.findMany({ where: { id: { in: ids }, organisationId, productId }, select: { id: true } });
    if (rows.length !== new Set(ids).size) throw new BadRequestException('Every requirement must belong to this product and organisation.');
    await this.prisma.$transaction(async tx => { await tx.requirement.updateMany({ where: { id: { in: ids }, organisationId, productId }, data: { status } }); await tx.auditLog.create({ data: { organisationId, actorUserId: req.organisationMembership!.userId, entityType: 'Requirement', entityId: productId, action: 'BULK_STATUS_UPDATED', after: { ids, status } as unknown as Prisma.InputJsonValue } }); });
    return { updated: rows.length, status };
  }

  @Patch('requirements/:requirementId')
  async updateRequirement(@Req() req: AuthenticatedRequest, @Param('requirementId') requirementId: string, @Body() body: unknown) {
    assertCanWrite(req);
    const organisationId = req.organisationMembership!.organisationId;
    const data = parse<any>(updateRequirementSchema, body);
    const existing = await this.prisma.requirement.findFirst({ where: { id: requirementId, organisationId } });
    if (!existing) throw new NotFoundException('Requirement not found.');
    if (Object.prototype.hasOwnProperty.call(data, 'releaseId')) { await this.assertRelease(data.releaseId, existing.productId, organisationId); }
    if (Object.prototype.hasOwnProperty.call(data, 'initiativeId')) { await this.assertInitiative(data.initiativeId, existing.productId, organisationId); }
    const updated = await this.prisma.$transaction(async tx => {
      const result = await tx.requirement.update({ where: { id: requirementId }, data });
      await tx.auditLog.create({ data: {
        organisationId, actorUserId: req.organisationMembership!.userId,
        entityType: 'Requirement', entityId: requirementId, action: 'UPDATED',
        before: existing as unknown as Prisma.InputJsonValue,
        after: result as unknown as Prisma.InputJsonValue,
      }});
      return result;
    });
    return withRiceScore(updated);
  }

  private async assertProductExists(productId: string, organisationId: string) {
    const product = await this.prisma.product.findFirst({ where: { id: productId, organisationId }, select: { id: true } });
    if (!product) throw new NotFoundException('Product not found in this organisation.');
  }

  private async assertInitiative(initiativeId: string | null | undefined, productId: string, organisationId: string) { if (!initiativeId) return; const initiative = await this.prisma.initiative.findFirst({ where: { id: initiativeId, productId, organisationId }, select: { id: true } }); if (!initiative) throw new BadRequestException('Initiative must belong to the same product and organisation.'); }

  private async assertRelease(releaseId: string | null | undefined, productId: string, organisationId: string) {
    if (!releaseId) return;
    const release = await this.prisma.release.findFirst({
      where: { id: releaseId, productId, organisationId }, select: { id: true },
    });
    if (!release) throw new BadRequestException('Release must belong to the same product and organisation.');
  }
}
