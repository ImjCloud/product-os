import { BadRequestException, Body, Controller, Get, Post, Req, UseGuards, ConflictException, Param, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { PrismaService } from '../database/prisma.service';
import { BearerAuthGuard } from '../auth/bearer-auth.guard';
import { AuthenticatedRequest } from '../auth/organisation.guard';

const createSchema = z.object({ name: z.string().trim().min(2).max(120), slug: z.string().trim().min(2).max(60).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional() }).strict();
const slugify = (value: string) => value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 55);

@Controller('organisations')
@UseGuards(BearerAuthGuard)
export class OrganisationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Req() req: AuthenticatedRequest) {
    return this.prisma.membership.findMany({ where: { userId: req.user!.sub! }, include: { organisation: { select: { id: true, name: true, slug: true, createdAt: true } } }, orderBy: { createdAt: 'asc' } });
  }

  @Get(':organisationId/portfolio-overview')
  async portfolioOverview(@Req() req: AuthenticatedRequest, @Param('organisationId') organisationId: string) {
    const userId = req.user?.sub;
    if (!userId) throw new BadRequestException('Authenticated identity is required.');
    const membership = await this.prisma.membership.findUnique({ where: { organisationId_userId: { organisationId, userId } }, select: { organisationId: true } });
    if (!membership) throw new ForbiddenException('Organisation membership is required.');
    const products = await this.prisma.product.findMany({ where: { organisationId, archivedAt: null }, select: { id: true, name: true, description: true, updatedAt: true }, orderBy: { updatedAt: 'desc' } });
    const ids = products.map(p => p.id);
    if (!ids.length) return { generatedAt: new Date().toISOString(), totals: { products: 0, initiatives: 0, actionsOpen: 0, actionsOverdue: 0, risksOpen: 0, issuesOpen: 0, decisionsPending: 0, dependenciesOpen: 0, changesPending: 0 }, products: [], attentionItems: [] };
    const [initiatives, actions, risks, issues, decisions, dependencies, changes] = await Promise.all([
      this.prisma.initiative.groupBy({ by: ['productId'], where: { organisationId, productId: { in: ids }, status: { notIn: ['COMPLETED', 'CANCELLED'] } }, _count: { _all: true } }),
      this.prisma.actionItem.findMany({ where: { organisationId, productId: { in: ids }, status: { not: 'DONE' } }, select: { productId: true, dueAt: true } }),
      this.prisma.risk.groupBy({ by: ['productId'], where: { organisationId, productId: { in: ids }, status: { notIn: ['CLOSED', 'ACCEPTED'] } }, _count: { _all: true } }),
      this.prisma.issue.groupBy({ by: ['productId'], where: { organisationId, productId: { in: ids }, status: { notIn: ['RESOLVED', 'CLOSED'] } }, _count: { _all: true } }),
      this.prisma.decision.groupBy({ by: ['productId'], where: { organisationId, productId: { in: ids }, status: { in: ['PROPOSED', 'DEFERRED'] } }, _count: { _all: true } }),
      this.prisma.dependency.groupBy({ by: ['productId'], where: { organisationId, productId: { in: ids }, status: { not: 'RESOLVED' } }, _count: { _all: true } }),
      this.prisma.changeRequest.groupBy({ by: ['productId'], where: { organisationId, productId: { in: ids }, status: { in: ['SUBMITTED', 'UNDER_REVIEW'] } }, _count: { _all: true } }),
    ]);
    const now = new Date();
    const [attentionActions, attentionRisks, attentionIssues, attentionDecisions, attentionDependencies, attentionChanges] = await Promise.all([
      this.prisma.actionItem.findMany({ where: { organisationId, productId: { in: ids }, status: { not: 'DONE' }, dueAt: { lt: now } }, select: { id: true, productId: true, title: true, status: true, dueAt: true, priority: true }, orderBy: { dueAt: 'asc' }, take: 12 }),
      this.prisma.risk.findMany({ where: { organisationId, productId: { in: ids }, status: { notIn: ['CLOSED', 'ACCEPTED'] } }, select: { id: true, productId: true, title: true, status: true, reviewDate: true, probability: true, impact: true }, orderBy: { updatedAt: 'asc' }, take: 8 }),
      this.prisma.issue.findMany({ where: { organisationId, productId: { in: ids }, status: { notIn: ['RESOLVED', 'CLOSED'] } }, select: { id: true, productId: true, title: true, status: true, dueAt: true, severity: true }, orderBy: [{ severity: 'desc' }, { updatedAt: 'asc' }], take: 8 }),
      this.prisma.decision.findMany({ where: { organisationId, productId: { in: ids }, status: { in: ['PROPOSED', 'DEFERRED'] } }, select: { id: true, productId: true, title: true, status: true, updatedAt: true }, orderBy: { updatedAt: 'asc' }, take: 8 }),
      this.prisma.dependency.findMany({ where: { organisationId, productId: { in: ids }, status: { not: 'RESOLVED' } }, select: { id: true, productId: true, title: true, status: true, neededBy: true }, orderBy: { neededBy: 'asc' }, take: 8 }),
      this.prisma.changeRequest.findMany({ where: { organisationId, productId: { in: ids }, status: { in: ['SUBMITTED', 'UNDER_REVIEW'] } }, select: { id: true, productId: true, title: true, status: true, updatedAt: true }, orderBy: { updatedAt: 'asc' }, take: 8 }),
    ]);
    const productNames = new Map(products.map(p => [p.id, p.name]));
    const attentionItems = [
      ...attentionActions.map(x => ({ ...x, kind: 'action', label: 'Overdue action', target: 'Action items', productName: productNames.get(x.productId) || '' })),
      ...attentionRisks.map(x => ({ ...x, kind: 'risk', label: 'Open risk', target: 'Analysis registers', registerKind: 'risks', productName: productNames.get(x.productId) || '' })),
      ...attentionIssues.map(x => ({ ...x, kind: 'issue', label: 'Open issue', target: 'Analysis registers', registerKind: 'issues', productName: productNames.get(x.productId) || '' })),
      ...attentionDecisions.map(x => ({ ...x, kind: 'decision', label: 'Pending decision', target: 'Analysis registers', registerKind: 'decisions', productName: productNames.get(x.productId) || '' })),
      ...attentionDependencies.map(x => ({ ...x, kind: 'dependency', label: 'Unresolved dependency', target: 'Analysis registers', registerKind: 'dependencies', productName: productNames.get(x.productId) || '' })),
      ...attentionChanges.map(x => ({ ...x, kind: 'change', label: 'Pending change request', target: 'Analysis registers', registerKind: 'change-requests', productName: productNames.get(x.productId) || '' })),
    ].slice(0, 40);
    const map = (rows: any[]) => Object.fromEntries(rows.map(row => [row.productId, row._count._all]));
    const byProduct = { initiatives: map(initiatives), risks: map(risks), issues: map(issues), decisions: map(decisions), dependencies: map(dependencies), changes: map(changes) };
    const rows = products.map(product => {
      const productActions = actions.filter(a => a.productId === product.id);
      return { ...product, counts: { initiatives: byProduct.initiatives[product.id] || 0, actionsOpen: productActions.length, actionsOverdue: productActions.filter(a => a.dueAt && a.dueAt < now).length, risksOpen: byProduct.risks[product.id] || 0, issuesOpen: byProduct.issues[product.id] || 0, decisionsPending: byProduct.decisions[product.id] || 0, dependenciesOpen: byProduct.dependencies[product.id] || 0, changesPending: byProduct.changes[product.id] || 0 } };
    });
    const keys = ['initiatives','actionsOpen','actionsOverdue','risksOpen','issuesOpen','decisionsPending','dependenciesOpen','changesPending'];
    const totals: Record<string, number> = { products: rows.length };
    for (const key of keys) totals[key] = rows.reduce((sum, row) => sum + Number((row.counts as any)[key] || 0), 0);
    return { generatedAt: now.toISOString(), totals, products: rows, attentionItems };
  }

  @Post()
  async create(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    const slug = parsed.data.slug || slugify(parsed.data.name);
    if (await this.prisma.organisation.findUnique({ where: { slug }, select: { id: true } })) throw new ConflictException('This organisation URL is already in use.');
    if (slug.length < 2) throw new BadRequestException('Organisation name must produce a valid slug.');
    return this.prisma.$transaction(async tx => {
      const organisation = await tx.organisation.create({ data: { name: parsed.data.name, slug } });
      await tx.membership.create({ data: { organisationId: organisation.id, userId: req.user!.sub!, role: 'OWNER' } });
      await tx.auditLog.create({ data: { organisationId: organisation.id, actorUserId: req.user!.sub!, entityType: 'Organisation', entityId: organisation.id, action: 'CREATED', after: organisation as unknown as Prisma.InputJsonValue } });
      return { organisation, role: 'OWNER' };
    });
  }
}
