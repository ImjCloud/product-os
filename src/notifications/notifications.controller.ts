import { Body, Controller, Get, NotFoundException, Param, Patch, Post, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuthenticatedRequest, OrganisationGuard } from '../auth/organisation.guard';
import { assertCanWrite } from '../auth/roles';
@Controller('notifications')
@UseGuards(OrganisationGuard)
export class NotificationsController {
  constructor(private readonly prisma: PrismaService) {}
  @Get()
  async list(@Req() req: AuthenticatedRequest) {
    const { organisationId, userId } = req.organisationMembership!;
    const visibleItems = await this.prisma.actionItem.findMany({
      where: { organisationId, OR: [{ visibility: 'SHARED' }, { createdById: userId }] },
      select: { id: true },
    });
    return this.prisma.notification.findMany({
      where: {
        organisationId,
        userId,
        OR: [
          { entityType: null },
          { entityType: { not: 'ActionItem' } },
          { entityType: 'ActionItem', entityId: { in: visibleItems.map(item => item.id) } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
  @Patch(':notificationId/read')
  async markRead(@Req() req: AuthenticatedRequest, @Param('notificationId') id: string) {
    const { organisationId, userId } = req.organisationMembership!;
    const item = await this.prisma.notification.findFirst({ where: { id, organisationId, userId } });
    if (!item) throw new NotFoundException('Notification not found.');
    if (item.entityType === 'ActionItem' && item.entityId) {
      const visible = await this.prisma.actionItem.findFirst({
        where: { id: item.entityId, organisationId, OR: [{ visibility: 'SHARED' }, { createdById: userId }] },
        select: { id: true },
      });
      if (!visible) throw new NotFoundException('Notification not found.');
    }
    return this.prisma.notification.update({ where: { id }, data: { readAt: item.readAt ?? new Date() } });
  }
  @Post('read-all') async readAll(@Req() req: AuthenticatedRequest) { const { organisationId, userId } = req.organisationMembership!; const result = await this.prisma.notification.updateMany({ where: { organisationId, userId, readAt: null }, data: { readAt: new Date() } }); return { updated: result.count }; }
  @Post() async create(@Req() req: AuthenticatedRequest, @Body() body: any) { assertCanWrite(req); const { organisationId } = req.organisationMembership!; if (typeof body?.userId !== 'string' || typeof body?.title !== 'string' || typeof body?.body !== 'string') throw new BadRequestException('userId, title and body are required.'); const member = await this.prisma.membership.findUnique({ where: { organisationId_userId: { organisationId, userId: body.userId } } }); if (!member) throw new BadRequestException('Recipient must belong to this organisation.'); return this.prisma.notification.create({ data: { organisationId, userId: body.userId, type: String(body.type || 'GENERAL').slice(0,60), title: body.title.trim().slice(0,180), body: body.body.trim().slice(0,2000), entityType: body.entityType?.slice(0,80), entityId: body.entityId?.slice(0,100) } }); }
}
