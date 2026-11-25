import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AuthenticatedRequest, OrganisationGuard } from '../auth/organisation.guard';
import { assertCanWrite } from '../auth/roles';
import { createActionItemSchema, updateActionItemSchema } from './action-items.schemas';
import { buildActionItemActivity } from './action-item-activity';
function parse(schema: any, value: unknown) { const p = schema.safeParse(value); if (!p.success) throw new BadRequestException(p.error.flatten()); return p.data; }
@Controller()
@UseGuards(OrganisationGuard)
export class ActionItemsController {
  constructor(private readonly prisma: PrismaService) {}
  @Get('products/:productId/action-items') async list(@Req() req: AuthenticatedRequest, @Param('productId') productId: string, @Query('status') status?: string, @Query('priority') priority?: string) {
    const org = req.organisationMembership!.organisationId; await this.assertProduct(productId, org);
    if (status && !['TODO','IN_PROGRESS','BLOCKED','DONE'].includes(status)) throw new BadRequestException('Invalid action item status.');
    if (priority && !['LOW','MEDIUM','HIGH','URGENT'].includes(priority)) throw new BadRequestException('Invalid action item priority.');
    const rows = await this.prisma.actionItem.findMany({ where: { organisationId: org, productId, OR: [{ visibility: 'SHARED' }, { createdById: req.organisationMembership!.userId }], ...(status ? { status: status as any } : {}), ...(priority ? { priority: priority as any } : {}) }, include: { assignee: { select: { id: true, name: true, email: true } }, feedback: { select: { id: true, text: true } }, requirement: { select: { id: true, title: true } }, release: { select: { id: true, version: true } }, initiative: { select: { id: true, name: true } } }, orderBy: [{ createdAt: 'desc' }] }); const rank: Record<string, number> = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }; return rows.sort((a, b) => rank[b.priority] - rank[a.priority] || (a.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER) - (b.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER));
  }
  @Post('products/:productId/action-items/bulk-update') async bulkUpdate(@Req() req: AuthenticatedRequest, @Param('productId') productId: string, @Body() body: unknown) {
    assertCanWrite(req); const org = req.organisationMembership!.organisationId; await this.assertProduct(productId, org);
    const ids = (body as any)?.ids; const status = (body as any)?.status;
    if (!Array.isArray(ids) || ids.length < 1 || ids.length > 100 || ids.some((id: unknown) => typeof id !== 'string') || new Set(ids).size !== ids.length) throw new BadRequestException('Provide 1–100 unique action item IDs.');
    if (!['TODO','IN_PROGRESS','BLOCKED','DONE'].includes(status)) throw new BadRequestException('Invalid action item status.');
    const rows = await this.prisma.actionItem.findMany({ where: { id: { in: ids }, organisationId: org, productId, OR: [{ visibility: 'SHARED' }, { createdById: req.organisationMembership!.userId }] }, select: { id: true } });
    if (rows.length !== ids.length) throw new BadRequestException('Every action item must belong to this product and organisation.');
    await this.prisma.$transaction(async tx => {
      await tx.actionItem.updateMany({ where: { id: { in: ids }, organisationId: org, productId, OR: [{ visibility: 'SHARED' }, { createdById: req.organisationMembership!.userId }] }, data: { status } });
      await tx.auditLog.create({ data: { organisationId: org, actorUserId: req.organisationMembership!.userId, entityType: 'ActionItem', entityId: productId, action: 'BULK_STATUS_UPDATED', after: { ids, status } as unknown as Prisma.InputJsonValue } });
    });
    return { updated: rows.length, status };
  }
  @Post('products/:productId/action-items') async create(@Req() req: AuthenticatedRequest, @Param('productId') productId: string, @Body() body: unknown) {
    assertCanWrite(req); const org = req.organisationMembership!.organisationId; await this.assertProduct(productId, org); const d = parse(createActionItemSchema, body); await this.assertLinks(d, productId, org);
    return this.prisma.$transaction(async tx => { const created = await tx.actionItem.create({ data: { organisationId: org, productId, title: d.title, description: d.description ?? '', status: d.status, priority: d.priority, assigneeId: d.assigneeId, assigneeLabel: d.assigneeLabel, dueAt: d.dueAt ? new Date(d.dueAt) : null, feedbackId: d.feedbackId, requirementId: d.requirementId, releaseId: d.releaseId, initiativeId: d.initiativeId, createdById: req.organisationMembership!.userId }, include: { assignee: { select: { id: true, name: true, email: true } } } }); await tx.auditLog.create({ data: { organisationId: org, actorUserId: req.organisationMembership!.userId, entityType: 'ActionItem', entityId: created.id, action: 'CREATED', after: created as unknown as Prisma.InputJsonValue } }); if (created.assigneeId && created.assigneeId !== req.organisationMembership!.userId) await tx.notification.create({ data: { organisationId: org, userId: created.assigneeId, type: 'ACTION_ASSIGNED', title: 'You have a new action item', body: created.title, entityType: 'ActionItem', entityId: created.id } }); return created; });
  }
  @Patch('action-items/:actionItemId') async update(@Req() req: AuthenticatedRequest, @Param('actionItemId') id: string, @Body() body: unknown) {
    assertCanWrite(req); const org = req.organisationMembership!.organisationId; const d = parse(updateActionItemSchema, body); const before = await this.prisma.actionItem.findFirst({ where: { id, organisationId: org, OR: [{ visibility: 'SHARED' }, { createdById: req.organisationMembership!.userId }] } }); if (!before) throw new NotFoundException('Action item not found.');
    await this.assertLinks({ ...before, ...d }, before.productId, org);
    const updated = await this.prisma.$transaction(async tx => { const result = await tx.actionItem.update({ where: { id }, data: { ...d, dueAt: d.dueAt === undefined ? undefined : d.dueAt ? new Date(d.dueAt) : null }, include: { assignee: { select: { id: true, name: true, email: true } } } }); await tx.auditLog.create({ data: { organisationId: org, actorUserId: req.organisationMembership!.userId, entityType: 'ActionItem', entityId: id, action: 'UPDATED', before: before as unknown as Prisma.InputJsonValue, after: result as unknown as Prisma.InputJsonValue } }); if (d.assigneeId && d.assigneeId !== before.assigneeId && d.assigneeId !== req.organisationMembership!.userId) await tx.notification.create({ data: { organisationId: org, userId: d.assigneeId, type: 'ACTION_ASSIGNED', title: 'An action item was assigned to you', body: result.title, entityType: 'ActionItem', entityId: id } }); return result; }); return updated;
  }
  @Get('action-items/:actionItemId/comments') async listComments(@Req() req: AuthenticatedRequest, @Param('actionItemId') id: string) { const org = req.organisationMembership!.organisationId; const item = await this.prisma.actionItem.findFirst({ where: { id, organisationId: org, OR: [{ visibility: 'SHARED' }, { createdById: req.organisationMembership!.userId }] }, select: { id: true } }); if (!item) throw new NotFoundException('Action item not found.'); return this.prisma.actionItemComment.findMany({ where: { organisationId: org, actionItemId: id }, include: { author: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: 'asc' } }); }
  @Post('action-items/:actionItemId/comments')
  async addComment(@Req() req: AuthenticatedRequest, @Param('actionItemId') id: string, @Body() body: unknown) {
    assertCanWrite(req);
    const org = req.organisationMembership!.organisationId;
    const text = (body as any)?.body;
    if (typeof text !== 'string' || !text.trim() || text.trim().length > 5000) {
      throw new BadRequestException('Comment must contain 1-5000 characters.');
    }

    return this.prisma.$transaction(async tx => {
      const item = await tx.actionItem.findFirst({
        where: {
          id,
          organisationId: org,
          OR: [{ visibility: 'SHARED' }, { createdById: req.organisationMembership!.userId }],
        },
        select: { id: true },
      });
      if (!item) throw new NotFoundException('Action item not found.');

      const comment = await tx.actionItemComment.create({
        data: {
          organisationId: org,
          actionItemId: id,
          authorId: req.organisationMembership!.userId,
          body: text.trim(),
        },
        include: { author: { select: { id: true, name: true, email: true } } },
      });

      await tx.auditLog.create({
        data: {
          organisationId: org,
          actorUserId: req.organisationMembership!.userId,
          entityType: 'ActionItem',
          entityId: id,
          action: 'COMMENT_ADDED',
          after: { commentId: comment.id, body: comment.body },
        },
      });
      return comment;
    });
  }
  @Delete('action-items/:actionItemId') async remove(@Req() req: AuthenticatedRequest, @Param('actionItemId') id: string) { assertCanWrite(req); const org = req.organisationMembership!.organisationId; const before = await this.prisma.actionItem.findFirst({ where: { id, organisationId: org, OR: [{ visibility: 'SHARED' }, { createdById: req.organisationMembership!.userId }] } }); if (!before) throw new NotFoundException('Action item not found.'); await this.prisma.$transaction(async tx => { await tx.auditLog.create({ data: { organisationId: org, actorUserId: req.organisationMembership!.userId, entityType: 'ActionItem', entityId: id, action: 'DELETED', before: before as unknown as Prisma.InputJsonValue } }); await tx.actionItem.delete({ where: { id } }); }); return { deleted: true }; }
  @Get('action-items/:actionItemId/activity')
  async activity(@Req() req: AuthenticatedRequest, @Param('actionItemId') id: string) {
    const org = req.organisationMembership!.organisationId;
    const visible = await this.prisma.actionItem.findFirst({
      where: {
        id,
        organisationId: org,
        OR: [{ visibility: 'SHARED' }, { createdById: req.organisationMembership!.userId }],
      },
      select: { id: true },
    });
    if (!visible) throw new NotFoundException('Action item not found.');

    const [audits, comments] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { organisationId: org, entityType: 'ActionItem', entityId: id },
        include: { actor: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      this.prisma.actionItemComment.findMany({
        where: { organisationId: org, actionItemId: id },
        include: { author: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'asc' },
      }),
    ]);
    return buildActionItemActivity(audits, comments);
  }
  private async assertProduct(id: string, org: string) { const p = await this.prisma.product.findFirst({ where: { id, organisationId: org }, select: { id: true } }); if (!p) throw new NotFoundException('Product not found.'); }
  private async assertLinks(d: any, productId: string, org: string) {
    if (d.assigneeId) { const m = await this.prisma.membership.findUnique({ where: { organisationId_userId: { organisationId: org, userId: d.assigneeId } }, select: { id: true } }); if (!m) throw new BadRequestException('Assignee must be a member of this organisation.'); }
    for (const [field, model] of [['feedbackId','feedback'],['requirementId','requirement'],['releaseId','release'],['initiativeId','initiative']] as const) { const id = d[field]; if (!id) continue; const row = await (this.prisma as any)[model].findFirst({ where: { id, productId, organisationId: org }, select: { id: true } }); if (!row) throw new BadRequestException(`${field} must belong to the same product and organisation.`); }
  }
}
