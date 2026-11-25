import { BadRequestException, Body, Controller, ForbiddenException, Get, NotFoundException, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { PrismaService } from '../database/prisma.service';
import { AuthenticatedRequest, OrganisationGuard } from '../auth/organisation.guard';
import { assertCanWrite } from '../auth/roles';

const TARGET_TYPES = ['INITIATIVE','REQUIREMENT','CHANGE_REQUEST','RELEASE','DEPLOYMENT','UAT_CYCLE','EVIDENCE','DECISION','RISK'] as const;
const createSchema = z.object({
  targetType: z.enum(TARGET_TYPES), targetId: z.string().min(1).max(100),
  title: z.string().trim().min(3).max(180), rationale: z.string().trim().min(5).max(10000),
  approverUserId: z.string().min(1).max(100), dueAt: z.string().datetime().nullable().optional(),
}).strict();
const decisionSchema = z.object({ decision: z.enum(['APPROVED','REJECTED']), decisionNote: z.string().trim().min(3).max(5000) }).strict();

@Controller()
@UseGuards(OrganisationGuard)
export class ApprovalsController {
  constructor(private readonly prisma: PrismaService) {}

  private async assertProduct(productId: string, organisationId: string) {
    const product = await this.prisma.product.findFirst({ where: { id: productId, organisationId }, select: { id: true } });
    if (!product) throw new NotFoundException('Product not found.');
  }

  private async assertTarget(type: string, id: string, productId: string, organisationId: string) {
    const modelByType: Record<string, string> = { INITIATIVE: 'initiative', REQUIREMENT: 'requirement', CHANGE_REQUEST: 'changeRequest', RELEASE: 'release', DEPLOYMENT: 'deployment', UAT_CYCLE: 'uatCycle', EVIDENCE: 'evidenceItem', DECISION: 'decision', RISK: 'risk' };
    const model = (this.prisma as any)[modelByType[type]];
    const record = await model.findFirst({ where: { id, productId, organisationId }, select: { id: true } });
    if (!record) throw new BadRequestException('The approval target must exist in the selected product and organisation.');
  }

  @Get('products/:productId/approval-targets')
  async targets(@Req() req: AuthenticatedRequest, @Param('productId') productId: string, @Query('targetType') targetType: string) {
    const org = req.organisationMembership!.organisationId; await this.assertProduct(productId, org);
    if (!(TARGET_TYPES as readonly string[]).includes(targetType)) throw new BadRequestException('Choose a supported approval target type.');
    const config: Record<string, { model: string; select: any; label: (row: any) => string }> = {
      INITIATIVE: { model: 'initiative', select: { id: true, name: true, status: true }, label: r => `${r.name} · ${r.status}` },
      REQUIREMENT: { model: 'requirement', select: { id: true, title: true, status: true }, label: r => `${r.title} · ${r.status}` },
      CHANGE_REQUEST: { model: 'changeRequest', select: { id: true, title: true, status: true }, label: r => `${r.title} · ${r.status}` },
      RELEASE: { model: 'release', select: { id: true, version: true, status: true }, label: r => `${r.version} · ${r.status}` },
      DEPLOYMENT: { model: 'deployment', select: { id: true, environment: true, status: true, createdAt: true }, label: r => `${r.environment} · ${r.status} · ${new Date(r.createdAt).toLocaleDateString()}` },
      UAT_CYCLE: { model: 'uatCycle', select: { id: true, name: true, status: true }, label: r => `${r.name} · ${r.status}` },
      EVIDENCE: { model: 'evidenceItem', select: { id: true, title: true, verificationStatus: true }, label: r => `${r.title} · ${r.verificationStatus}` },
      DECISION: { model: 'decision', select: { id: true, title: true, status: true }, label: r => `${r.title} · ${r.status}` },
      RISK: { model: 'risk', select: { id: true, title: true, status: true }, label: r => `${r.title} · ${r.status}` },
    };
    const c = config[targetType]; const rows = await (this.prisma as any)[c.model].findMany({ where: { organisationId: org, productId }, select: c.select, orderBy: { createdAt: 'desc' }, take: 250 });
    return rows.map((row: any) => ({ id: row.id, label: c.label(row) }));
  }

  @Get('products/:productId/approvals')
  async list(@Req() req: AuthenticatedRequest, @Param('productId') productId: string, @Query('scope') scope?: string) {
    const org = req.organisationMembership!.organisationId; const userId = req.organisationMembership!.userId;
    await this.assertProduct(productId, org);
    const where: any = { organisationId: org, productId };
    if (scope === 'assigned') where.approverUserId = userId;
    if (scope === 'requested') where.requesterUserId = userId;
    return this.prisma.approvalRequest.findMany({ where, include: { requester: { select: { id: true, name: true, email: true } }, approver: { select: { id: true, name: true, email: true } } }, orderBy: [{ status: 'asc' }, { dueAt: 'asc' }, { createdAt: 'desc' }], take: 300 });
  }

  @Post('products/:productId/approvals')
  async create(@Req() req: AuthenticatedRequest, @Param('productId') productId: string, @Body() body: unknown) {
    assertCanWrite(req); const org = req.organisationMembership!.organisationId; const requesterId = req.organisationMembership!.userId;
    await this.assertProduct(productId, org);
    const parsed = createSchema.safeParse(body); if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    const data = parsed.data;
    if (data.approverUserId === requesterId) throw new BadRequestException('Choose another organisation member to provide independent approval.');
    const approver = await this.prisma.membership.findUnique({ where: { organisationId_userId: { organisationId: org, userId: data.approverUserId } }, select: { userId: true } });
    if (!approver) throw new BadRequestException('The approver must be a member of this organisation.');
    await this.assertTarget(data.targetType, data.targetId, productId, org);
    return this.prisma.$transaction(async tx => {
      const row = await tx.approvalRequest.create({ data: { organisationId: org, productId, targetType: data.targetType, targetId: data.targetId, title: data.title, rationale: data.rationale, requesterUserId: requesterId, approverUserId: data.approverUserId, dueAt: data.dueAt ? new Date(data.dueAt) : null }, include: { requester: { select: { id: true, name: true, email: true } }, approver: { select: { id: true, name: true, email: true } } } });
      await tx.auditLog.create({ data: { organisationId: org, actorUserId: requesterId, entityType: 'ApprovalRequest', entityId: row.id, action: 'SUBMITTED', after: row as unknown as Prisma.InputJsonValue } });
      await tx.notification.create({ data: {
        organisationId: org, userId: data.approverUserId, type: 'APPROVAL_ASSIGNED',
        title: 'Approval requested', body: `${row.title} needs your review.`,
        entityType: 'ApprovalRequest', entityId: row.id,
      } });
      return row;
    });
  }

  @Patch('products/:productId/approvals/:id/decision')
  async decide(@Req() req: AuthenticatedRequest, @Param('productId') productId: string, @Param('id') id: string, @Body() body: unknown) {
    const org = req.organisationMembership!.organisationId; const userId = req.organisationMembership!.userId;
    const parsed = decisionSchema.safeParse(body); if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    const before = await this.prisma.approvalRequest.findFirst({ where: { id, organisationId: org, productId } });
    if (!before) throw new NotFoundException('Approval request not found.');
    if (before.approverUserId !== userId) throw new ForbiddenException('Only the assigned approver can decide this request.');
    if (before.status !== 'PENDING') throw new BadRequestException('Only pending approval requests can receive a decision.');
    return this.prisma.$transaction(async tx => {
      const row = await tx.approvalRequest.update({ where: { id }, data: { status: parsed.data.decision, decisionNote: parsed.data.decisionNote, decidedAt: new Date() }, include: { requester: { select: { id: true, name: true, email: true } }, approver: { select: { id: true, name: true, email: true } } } });
      await tx.auditLog.create({ data: { organisationId: org, actorUserId: userId, entityType: 'ApprovalRequest', entityId: id, action: parsed.data.decision, before: before as unknown as Prisma.InputJsonValue, after: row as unknown as Prisma.InputJsonValue } });
      if (before.requesterUserId && before.requesterUserId !== userId) {
        await tx.notification.create({ data: {
          organisationId: org, userId: before.requesterUserId, type: `APPROVAL_${parsed.data.decision}`,
          title: parsed.data.decision === 'APPROVED' ? 'Approval granted' : 'Approval rejected',
          body: `${before.title}: ${parsed.data.decision.toLowerCase()}.`,
          entityType: 'ApprovalRequest', entityId: id,
        } });
      }
      return row;
    });
  }

  @Patch('products/:productId/approvals/:id/withdraw')
  async withdraw(@Req() req: AuthenticatedRequest, @Param('productId') productId: string, @Param('id') id: string) {
    const org = req.organisationMembership!.organisationId; const userId = req.organisationMembership!.userId;
    const before = await this.prisma.approvalRequest.findFirst({ where: { id, organisationId: org, productId } });
    if (!before) throw new NotFoundException('Approval request not found.');
    if (before.requesterUserId !== userId) throw new ForbiddenException('Only the requester can withdraw this approval.');
    if (before.status !== 'PENDING') throw new BadRequestException('Only pending approval requests can be withdrawn.');
    return this.prisma.$transaction(async tx => {
      const row = await tx.approvalRequest.update({ where: { id }, data: { status: 'WITHDRAWN' } });
      await tx.auditLog.create({ data: { organisationId: org, actorUserId: userId, entityType: 'ApprovalRequest', entityId: id, action: 'WITHDRAWN', before: before as unknown as Prisma.InputJsonValue, after: row as unknown as Prisma.InputJsonValue } });
      return row;
    });
  }
}
