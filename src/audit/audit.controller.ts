import { BadRequestException, Controller, Get, NotFoundException, Param, Query, Req, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { PrismaService } from '../database/prisma.service';
import { AuthenticatedRequest, OrganisationGuard } from '../auth/organisation.guard';

const querySchema = z.object({
  entityType: z.string().trim().max(80).optional(),
  entityId: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

@Controller('audit')
@UseGuards(OrganisationGuard)
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Req() req: AuthenticatedRequest, @Query() query: unknown) {
    const p = querySchema.safeParse(query);
    if (!p.success) throw new BadRequestException(p.error.flatten());

    const org = req.organisationMembership!.organisationId;
    const userId = req.organisationMembership!.userId;

    const visibleItems = await this.prisma.actionItem.findMany({
      where: {
        organisationId: org,
        OR: [{ visibility: 'SHARED' }, { createdById: userId }],
      },
      select: { id: true },
    });

    return this.prisma.auditLog.findMany({
      where: {
        organisationId: org,
        AND: [{
          OR: [
            { entityType: { not: 'ActionItem' } },
            { entityType: 'ActionItem', entityId: { in: visibleItems.map(item => item.id) } },
          ],
        }],
        ...(p.data.entityType ? { entityType: p.data.entityType } : {}),
        ...(p.data.entityId ? { entityId: p.data.entityId } : {}),
      },
      include: { actor: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: p.data.limit,
    });
  }

  @Get(':entityType/:entityId')
  async history(
    @Req() req: AuthenticatedRequest,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    const org = req.organisationMembership!.organisationId;

    if (entityType === 'ActionItem') {
      const item = await this.prisma.actionItem.findFirst({
        where: {
          id: entityId,
          organisationId: org,
          OR: [{ visibility: 'SHARED' }, { createdById: req.organisationMembership!.userId }],
        },
        select: { id: true },
      });
      if (!item) throw new NotFoundException('Audit history not found.');
    }

    return this.prisma.auditLog.findMany({
      where: { organisationId: org, entityType, entityId },
      include: { actor: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}