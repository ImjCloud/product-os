import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards, BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { OrganisationGuard, AuthenticatedRequest } from '../auth/organisation.guard';
import { assertCanWrite } from '../auth/roles';
import { createFeedbackSchema, createProductSchema, updateFeedbackSchema, updateProductSchema } from './products-feedback.schemas';
function parse<T>(schema: { safeParse: (value: unknown) => any }, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new BadRequestException({
    message: 'Validation failed.',
    issues: result.error.issues.map((issue: any) => ({ path: issue.path.join('.'), message: issue.message })),
  });
  return result.data as T;
}
@Controller()
@UseGuards(OrganisationGuard)
export class ProductsFeedbackController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('products')
  listProducts(@Req() req: AuthenticatedRequest) {
    return this.prisma.product.findMany({
      where: { organisationId: req.organisationMembership!.organisationId, archivedAt: null },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, description: true, createdAt: true, updatedAt: true },
    });
  }

  @Get('products/archived')
  listArchivedProducts(@Req() req: AuthenticatedRequest) {
    return this.prisma.product.findMany({
      where: { organisationId: req.organisationMembership!.organisationId, archivedAt: { not: null } },
      orderBy: { archivedAt: 'desc' },
      select: { id: true, name: true, description: true, createdAt: true, updatedAt: true, archivedAt: true },
    });
  }

  @Post('products')
  async createProduct(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    assertCanWrite(req);
    const organisationId = req.organisationMembership!.organisationId;
    const data = parse<{ name: string; description?: string }>(createProductSchema, body);
    return this.prisma.$transaction(async tx => {
      const product = await tx.product.create({ data: { organisationId, ...data } });
      await tx.auditLog.create({ data: {
        organisationId, actorUserId: req.organisationMembership!.userId,
        entityType: 'Product', entityId: product.id, action: 'CREATED',
        after: product as unknown as Prisma.InputJsonValue,
      }});
      return product;
    });
  }

  @Patch('products/:productId')
  async updateProduct(@Req() req: AuthenticatedRequest, @Param('productId') productId: string, @Body() body: unknown) {
    assertCanWrite(req); const organisationId = req.organisationMembership!.organisationId;
    const data = parse<any>(updateProductSchema, body);
    const existing = await this.prisma.product.findFirst({ where: { id: productId, organisationId } });
    if (!existing) throw new NotFoundException('Product not found.');
    return this.prisma.$transaction(async tx => { const updated = await tx.product.update({ where: { id: productId }, data }); await tx.auditLog.create({ data: { organisationId, actorUserId: req.organisationMembership!.userId, entityType: 'Product', entityId: productId, action: 'UPDATED', before: existing as unknown as Prisma.InputJsonValue, after: updated as unknown as Prisma.InputJsonValue } }); return updated; });
  }

  @Post('products/:productId/archive')
  async archiveProduct(@Req() req: AuthenticatedRequest, @Param('productId') productId: string) {
    assertCanWrite(req); const organisationId = req.organisationMembership!.organisationId;
    const existing = await this.prisma.product.findFirst({ where: { id: productId, organisationId } });
    if (!existing) throw new NotFoundException('Product not found.');
    const updated = await this.prisma.product.update({ where: { id: productId }, data: { archivedAt: new Date() } });
    await this.prisma.auditLog.create({ data: { organisationId, actorUserId: req.organisationMembership!.userId, entityType: 'Product', entityId: productId, action: 'ARCHIVED', before: existing as unknown as Prisma.InputJsonValue, after: updated as unknown as Prisma.InputJsonValue } });
    return updated;
  }

  @Post('products/:productId/restore')
  async restoreProduct(@Req() req: AuthenticatedRequest, @Param('productId') productId: string) {
    assertCanWrite(req); const organisationId = req.organisationMembership!.organisationId;
    const existing = await this.prisma.product.findFirst({ where: { id: productId, organisationId } });
    if (!existing) throw new NotFoundException('Product not found.');
    const updated = await this.prisma.product.update({ where: { id: productId }, data: { archivedAt: null } });
    await this.prisma.auditLog.create({ data: { organisationId, actorUserId: req.organisationMembership!.userId, entityType: 'Product', entityId: productId, action: 'RESTORED', before: existing as unknown as Prisma.InputJsonValue, after: updated as unknown as Prisma.InputJsonValue } });
    return updated;
  }

  @Get('products/:productId/feedback')
  async listFeedback(@Req() req: AuthenticatedRequest, @Param('productId') productId: string) {
    const organisationId = req.organisationMembership!.organisationId;
    const product = await this.prisma.product.findFirst({ where: { id: productId, organisationId }, select: { id: true } });
    if (!product) throw new NotFoundException('Product not found.');
    return this.prisma.feedback.findMany({ where: { organisationId, productId }, orderBy: { occurredAt: 'desc' } });
  }

  @Post('products/:productId/feedback')
  async createFeedback(@Req() req: AuthenticatedRequest, @Param('productId') productId: string, @Body() body: unknown) {
    assertCanWrite(req);
    const organisationId = req.organisationMembership!.organisationId;
    const data = parse<any>(createFeedbackSchema, body);
    const product = await this.prisma.product.findFirst({ where: { id: productId, organisationId }, select: { id: true } });
    if (!product) throw new NotFoundException('Product not found in this organisation.');
    return this.prisma.$transaction(async tx => {
      const feedback = await tx.feedback.create({ data: {
        organisationId, productId, text: data.text, source: data.source ?? 'Internal',
        segment: data.segment, theme: data.theme, sentiment: data.sentiment, severity: data.severity,
        owner: data.owner, dueAt: data.dueAt ? new Date(data.dueAt) : undefined,
        externalRef: data.externalRef, sourceUrl: data.sourceUrl,
      }});
      await tx.auditLog.create({ data: {
        organisationId, actorUserId: req.organisationMembership!.userId,
        entityType: 'Feedback', entityId: feedback.id, action: 'CREATED',
        after: feedback as unknown as Prisma.InputJsonValue,
      }});
      return feedback;
    });
  }

  @Post('products/:productId/feedback/bulk-update')
  async bulkUpdateFeedback(@Req() req: AuthenticatedRequest, @Param('productId') productId: string, @Body() body: any) {
    assertCanWrite(req); const organisationId = req.organisationMembership!.organisationId;
    const ids = body?.ids; const status = body?.status;
    if (!Array.isArray(ids) || ids.length < 1 || ids.length > 100 || ids.some((id: unknown) => typeof id !== 'string')) throw new BadRequestException('Provide between 1 and 100 feedback IDs.');
    if (!['OPEN','IN_PROGRESS','DONE'].includes(status)) throw new BadRequestException('Invalid feedback status.');
    const rows = await this.prisma.feedback.findMany({ where: { id: { in: ids }, organisationId, productId }, select: { id: true } });
    if (rows.length !== new Set(ids).size) throw new BadRequestException('Every feedback item must belong to this product and organisation.');
    await this.prisma.$transaction(async tx => {
      await tx.feedback.updateMany({ where: { id: { in: ids }, organisationId, productId }, data: { status } });
      await tx.auditLog.create({ data: { organisationId, actorUserId: req.organisationMembership!.userId, entityType: 'Feedback', entityId: productId, action: 'BULK_STATUS_UPDATED', after: { ids, status } as unknown as Prisma.InputJsonValue } });
    });
    return { updated: rows.length, status };
  }

  @Patch('feedback/:feedbackId')
  async updateFeedback(@Req() req: AuthenticatedRequest, @Param('feedbackId') feedbackId: string, @Body() body: unknown) {
    assertCanWrite(req);
    const organisationId = req.organisationMembership!.organisationId;
    const data = parse<any>(updateFeedbackSchema, body);
    const existing = await this.prisma.feedback.findFirst({ where: { id: feedbackId, organisationId } });
    if (!existing) throw new NotFoundException('Feedback item not found.');
    return this.prisma.$transaction(async tx => {
      const updated = await tx.feedback.update({ where: { id: feedbackId }, data });
      await tx.auditLog.create({ data: {
        organisationId, actorUserId: req.organisationMembership!.userId,
        entityType: 'Feedback', entityId: feedbackId, action: 'UPDATED',
        before: existing as unknown as Prisma.InputJsonValue,
        after: updated as unknown as Prisma.InputJsonValue,
      }});
      return updated;
    });
  }
}
