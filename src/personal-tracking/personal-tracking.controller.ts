import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, NotFoundException, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { PrismaService } from '../database/prisma.service';
import { AuthenticatedRequest, OrganisationGuard } from '../auth/organisation.guard';
import { assertCanWrite } from '../auth/roles';

const trackerSchema = z.object({ title: z.string().trim().min(2).max(160), description: z.string().trim().max(5000).optional() }).strict();
const actionSchema = z.object({ title: z.string().trim().min(2).max(180), description: z.string().trim().max(5000).optional(), priority: z.enum(['LOW','MEDIUM','HIGH','URGENT']).optional(), dueAt: z.string().datetime().nullable().optional(), followUpAt: z.string().datetime().nullable().optional() }).strict();
const bulkActionSchema = z.object({ actions: z.array(z.object({ title: z.string().trim().min(2).max(180), description: z.string().trim().max(5000).optional(), priority: z.enum(['LOW','MEDIUM','HIGH','URGENT']).optional(), dueAt: z.string().datetime().nullable().optional(), followUpAt: z.string().datetime().nullable().optional() }).strict()).min(1).max(50) }).strict();
const actionUpdateSchema = z.object({ title: z.string().trim().min(2).max(180).optional(), description: z.string().trim().max(5000).optional(), status: z.enum(['TODO','IN_PROGRESS','WAITING','DONE','CANCELLED']).optional(), priority: z.enum(['LOW','MEDIUM','HIGH','URGENT']).optional(), dueAt: z.string().datetime().nullable().optional(), followUpAt: z.string().datetime().nullable().optional() }).strict().refine(v => Object.keys(v).length > 0);
const shareSchema = z.object({ userId: z.string().min(1), access: z.enum(['VIEW','EDIT']).default('VIEW') }).strict();
const updateSchema = z.object({ note: z.string().trim().min(1).max(5000), status: z.enum(['TODO','IN_PROGRESS','WAITING','DONE','CANCELLED']).optional() }).strict();

@Controller()
@UseGuards(OrganisationGuard)
export class PersonalTrackingController {
  constructor(private readonly prisma: PrismaService) {}
  private org(req: AuthenticatedRequest) { return req.organisationMembership!.organisationId; }
  private user(req: AuthenticatedRequest) { return req.organisationMembership!.userId; }
  private async product(productId: string, org: string) { const p = await this.prisma.product.findFirst({ where: { id: productId, organisationId: org }, select: { id: true, name: true } }); if (!p) throw new NotFoundException('Product not found.'); return p; }
  private async trackerAccess(id: string, org: string, user: string, edit = false) {
    const tracker = await this.prisma.personalTracker.findFirst({ where: { id, organisationId: org }, include: { shares: { where: { userId: user }, select: { access: true } } } });
    if (!tracker) throw new NotFoundException('Personal tracker not found.');
    const owner = tracker.ownerId === user; const access = owner ? 'EDIT' : tracker.shares[0]?.access;
    if (!access || (edit && access !== 'EDIT')) throw new ForbiddenException('You do not have access to this personal tracker.');
    return { tracker, owner, access };
  }
  private async actionAccess(id: string, org: string, user: string, edit = false) {
    const action = await this.prisma.personalActionItem.findFirst({ where: { id, organisationId: org }, include: { tracker: { include: { shares: { where: { userId: user }, select: { access: true } } } }, shares: { where: { userId: user }, select: { access: true } } } });
    if (!action) throw new NotFoundException('Personal action point not found.');
    const owner = action.tracker.ownerId === user; const grants = [action.tracker.shares[0]?.access, action.shares[0]?.access].filter(Boolean); const access = owner ? 'EDIT' : grants.includes('EDIT') ? 'EDIT' : grants.includes('VIEW') ? 'VIEW' : undefined;
    if (!access || (edit && access !== 'EDIT')) throw new ForbiddenException('You do not have access to this personal action point.');
    return { action, owner, access };
  }

  @Get('products/:productId/personal-trackers')
  async list(@Req() req: AuthenticatedRequest, @Param('productId') productId: string) {
    const org = this.org(req), user = this.user(req); await this.product(productId, org);
    const trackers = await this.prisma.personalTracker.findMany({
      where: { organisationId: org, productId, OR: [{ ownerId: user }, { shares: { some: { userId: user } } }] },
      include: { owner: { select: { id: true, name: true, email: true } }, shares: { include: { user: { select: { id: true, name: true, email: true } } } },
        actions: { where: { OR: [{ tracker: { is: { ownerId: user } } }, { shares: { some: { userId: user } } }, { tracker: { is: { shares: { some: { userId: user } } } } }] }, include: { shares: { include: { user: { select: { id: true, name: true, email: true } } } }, updates: { orderBy: { createdAt: 'desc' }, take: 8, include: { author: { select: { id: true, name: true, email: true } } } } }, orderBy: [{ dueAt: 'asc' }, { updatedAt: 'desc' }] } }, orderBy: { updatedAt: 'desc' },
    });
    const sharedActions = await this.prisma.personalActionItem.findMany({ where: { organisationId: org, tracker: { is: { productId, organisationId: org, ownerId: { not: user }, shares: { none: { userId: user } } } }, shares: { some: { userId: user } } }, include: { tracker: { select: { owner: { select: { name: true, email: true } } } }, shares: { where: { userId: user } }, updates: { orderBy: { createdAt: 'desc' }, take: 8, include: { author: { select: { id: true, name: true, email: true } } } } }, orderBy: { updatedAt: 'desc' } });
    return { trackers: trackers.map(t => ({ ...t, myAccess: t.ownerId === user ? 'OWNER' : t.shares.find(s => s.userId === user)?.access || 'VIEW', isOwner: t.ownerId === user, shares: t.ownerId === user ? t.shares : [], actions: t.actions.map(a => { const grants = [t.shares.find(s => s.userId === user)?.access, a.shares.find(s => s.userId === user)?.access].filter(Boolean); return { ...a, myAccess: t.ownerId === user ? 'OWNER' : grants.includes('EDIT') ? 'EDIT' : grants.includes('VIEW') ? 'VIEW' : 'VIEW', shares: t.ownerId === user ? a.shares : [] }; }) })), sharedActions };
  }

  @Get('products/:productId/personal-follow-ups')
  async followUps(@Req() req: AuthenticatedRequest, @Param('productId') productId: string) {
    const org = this.org(req), user = this.user(req);
    await this.product(productId, org);
    return this.prisma.personalActionItem.findMany({
      where: {
        organisationId: org, followUpAt: { not: null }, status: { notIn: ['DONE', 'CANCELLED'] },
        tracker: { is: { productId, organisationId: org } },
        OR: [
          { tracker: { is: { ownerId: user } } },
          { tracker: { is: { shares: { some: { userId: user } } } } },
          { shares: { some: { userId: user } } },
        ],
      },
      select: { id: true, title: true, status: true, priority: true, dueAt: true, followUpAt: true, tracker: { select: { id: true, title: true } } },
      orderBy: [{ followUpAt: 'asc' }, { priority: 'desc' }], take: 200,
    });
  }

  @Get('products/:productId/personal-timeline')
  async timeline(@Req() req: AuthenticatedRequest, @Param('productId') productId: string) {
    const org = this.org(req), user = this.user(req);
    await this.product(productId, org);
    const actions = await this.prisma.personalActionItem.findMany({
      where: {
        organisationId: org,
        tracker: { is: { productId, organisationId: org } },
        OR: [
          { tracker: { is: { ownerId: user } } },
          { tracker: { is: { shares: { some: { userId: user } } } } },
          { shares: { some: { userId: user } } },
        ],
      },
      select: {
        id: true, title: true, createdAt: true,
        tracker: { select: { id: true, title: true } },
        updates: { orderBy: { createdAt: 'desc' }, take: 30, include: { author: { select: { id: true, name: true, email: true } } } },
      },
      orderBy: { updatedAt: 'desc' }, take: 100,
    });
    const events = actions.flatMap(action => [
      { id: `${action.id}:created`, type: 'CREATED', at: action.createdAt, actionId: action.id, actionTitle: action.title, trackerId: action.tracker.id, trackerTitle: action.tracker.title, note: 'Action point created.', author: null },
      ...action.updates.map(update => ({ id: update.id, type: update.status ? 'STATUS' : 'UPDATE', at: update.createdAt, actionId: action.id, actionTitle: action.title, trackerId: action.tracker.id, trackerTitle: action.tracker.title, note: update.note, status: update.status, author: update.author })),
    ]);
    return events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 100);
  }

  @Post('products/:productId/personal-trackers')
  async createTracker(@Req() req: AuthenticatedRequest, @Param('productId') productId: string, @Body() body: unknown) {
    assertCanWrite(req); const org = this.org(req), user = this.user(req); await this.product(productId, org); const parsed = trackerSchema.safeParse(body); if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.prisma.personalTracker.create({ data: { organisationId: org, productId, ownerId: user, title: parsed.data.title, description: parsed.data.description || '' }, include: { actions: true } });
  }
  @Patch('personal-trackers/:trackerId')
  async updateTracker(@Req() req: AuthenticatedRequest, @Param('trackerId') id: string, @Body() body: unknown) { assertCanWrite(req); const { tracker, owner } = await this.trackerAccess(id, this.org(req), this.user(req), true); if (!owner) throw new ForbiddenException('Only the tracker owner can change its details.'); const parsed = trackerSchema.partial().safeParse(body); if (!parsed.success || !Object.keys(parsed.data || {}).length) throw new BadRequestException('Provide a valid title or description.'); return this.prisma.personalTracker.update({ where: { id: tracker.id }, data: parsed.data }); }
  @Delete('personal-trackers/:trackerId')
  async deleteTracker(@Req() req: AuthenticatedRequest, @Param('trackerId') id: string) { assertCanWrite(req); const { tracker, owner } = await this.trackerAccess(id, this.org(req), this.user(req)); if (!owner) throw new ForbiddenException('Only the tracker owner can delete it.'); await this.prisma.personalTracker.delete({ where: { id: tracker.id } }); return { deleted: true }; }

  @Post('personal-trackers/:trackerId/actions')
  async createAction(@Req() req: AuthenticatedRequest, @Param('trackerId') id: string, @Body() body: unknown) { assertCanWrite(req); const { tracker } = await this.trackerAccess(id, this.org(req), this.user(req), true); const parsed = actionSchema.safeParse(body); if (!parsed.success) throw new BadRequestException(parsed.error.flatten()); return this.prisma.personalActionItem.create({ data: { organisationId: this.org(req), trackerId: tracker.id, createdById: this.user(req), title: parsed.data.title, description: parsed.data.description || '', priority: parsed.data.priority || 'MEDIUM', dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null, followUpAt: parsed.data.followUpAt ? new Date(parsed.data.followUpAt) : null } }); }
  @Post('personal-trackers/:trackerId/actions/bulk')
  async createActionsBulk(@Req() req: AuthenticatedRequest, @Param('trackerId') id: string, @Body() body: unknown) {
    assertCanWrite(req);
    const { tracker } = await this.trackerAccess(id, this.org(req), this.user(req), true);
    const parsed = bulkActionSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    const rows = parsed.data.actions.map(action => ({
      organisationId: this.org(req), trackerId: tracker.id, createdById: this.user(req),
      title: action.title, description: action.description || '', priority: action.priority || 'MEDIUM',
      dueAt: action.dueAt ? new Date(action.dueAt) : null, followUpAt: action.followUpAt ? new Date(action.followUpAt) : null,
    }));
    const created = await this.prisma.$transaction(async tx => Promise.all(rows.map(data => tx.personalActionItem.create({ data }))));
    return { created: created.length, actions: created };
  }

  @Patch('personal-actions/:actionId')
  async updateAction(@Req() req: AuthenticatedRequest, @Param('actionId') id: string, @Body() body: unknown) {
    assertCanWrite(req);
    const { action } = await this.actionAccess(id, this.org(req), this.user(req), true);
    const parsed = actionUpdateSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    const d: any = { ...parsed.data };
    if (d.dueAt !== undefined) d.dueAt = d.dueAt ? new Date(d.dueAt) : null;
    if (d.followUpAt !== undefined) d.followUpAt = d.followUpAt ? new Date(d.followUpAt) : null;
    const changed: string[] = [];
    if (parsed.data.title !== undefined && parsed.data.title !== action.title) changed.push('title');
    if (parsed.data.description !== undefined && parsed.data.description !== action.description) changed.push('notes');
    if (parsed.data.priority !== undefined && parsed.data.priority !== action.priority) changed.push('priority');
    if (parsed.data.dueAt !== undefined && String(d.dueAt || '') !== String(action.dueAt || '')) changed.push('target date');
    if (parsed.data.followUpAt !== undefined && String(d.followUpAt || '') !== String(action.followUpAt || '')) changed.push('follow-up date');
    const statusChanged = parsed.data.status !== undefined && parsed.data.status !== action.status;
    return this.prisma.$transaction(async tx => {
      const updated = await tx.personalActionItem.update({ where: { id: action.id }, data: d });
      const entries: string[] = [];
      if (statusChanged) entries.push(`Status changed to ${parsed.data.status!.replaceAll('_', ' ').toLowerCase()}.`);
      if (changed.length) entries.push(`Updated ${changed.join(', ')}.`);
      if (entries.length) await tx.personalActionUpdate.create({ data: { organisationId: this.org(req), actionItemId: id, authorId: this.user(req), note: entries.join(' '), status: statusChanged ? parsed.data.status : null } });
      return updated;
    });
  }
  @Post('personal-actions/:actionId/updates')
  async addUpdate(@Req() req: AuthenticatedRequest, @Param('actionId') id: string, @Body() body: unknown) { assertCanWrite(req); const { action } = await this.actionAccess(id, this.org(req), this.user(req), true); const parsed = updateSchema.safeParse(body); if (!parsed.success) throw new BadRequestException(parsed.error.flatten()); return this.prisma.$transaction(async tx => { const update = await tx.personalActionUpdate.create({ data: { organisationId: this.org(req), actionItemId: action.id, authorId: this.user(req), note: parsed.data.note, status: parsed.data.status } }); if (parsed.data.status) await tx.personalActionItem.update({ where: { id }, data: { status: parsed.data.status } }); return update; }); }
  @Delete('personal-actions/:actionId')
  async deleteAction(@Req() req: AuthenticatedRequest, @Param('actionId') id: string) { assertCanWrite(req); const { action, owner } = await this.actionAccess(id, this.org(req), this.user(req)); if (!owner) throw new ForbiddenException('Only the tracker owner can delete an action point.'); await this.prisma.personalActionItem.delete({ where: { id: action.id } }); return { deleted: true }; }

  @Post('personal-trackers/:trackerId/share')
  async shareTracker(@Req() req: AuthenticatedRequest, @Param('trackerId') id: string, @Body() body: unknown) { assertCanWrite(req); const org = this.org(req); const user = this.user(req); const { tracker, owner } = await this.trackerAccess(id, org, user); if (!owner) throw new ForbiddenException('Only the tracker owner can share it.'); const parsed = shareSchema.safeParse(body); if (!parsed.success) throw new BadRequestException(parsed.error.flatten()); if (parsed.data.userId === user) throw new BadRequestException('You already own this tracker.'); const member = await this.prisma.membership.findUnique({ where: { organisationId_userId: { organisationId: org, userId: parsed.data.userId } }, select: { id: true } }); if (!member) throw new BadRequestException('Choose a member of this workspace.'); return this.prisma.personalTrackerShare.upsert({ where: { trackerId_userId: { trackerId: id, userId: parsed.data.userId } }, create: { organisationId: org, trackerId: id, userId: parsed.data.userId, access: parsed.data.access }, update: { access: parsed.data.access } }); }
  @Delete('personal-trackers/:trackerId/share/:userId')
  async unshareTracker(@Req() req: AuthenticatedRequest, @Param('trackerId') id: string, @Param('userId') targetUserId: string) { assertCanWrite(req); const { tracker, owner } = await this.trackerAccess(id, this.org(req), this.user(req)); if (!owner) throw new ForbiddenException('Only the tracker owner can change sharing.'); await this.prisma.personalTrackerShare.deleteMany({ where: { organisationId: this.org(req), trackerId: tracker.id, userId: targetUserId } }); return { unshared: true }; }
  @Post('personal-actions/:actionId/share')
  async shareAction(@Req() req: AuthenticatedRequest, @Param('actionId') id: string, @Body() body: unknown) { assertCanWrite(req); const org = this.org(req), user = this.user(req); const { action, owner } = await this.actionAccess(id, org, user); if (!owner) throw new ForbiddenException('Only the tracker owner can share an individual action.'); const parsed = shareSchema.safeParse(body); if (!parsed.success) throw new BadRequestException(parsed.error.flatten()); if (parsed.data.userId === user) throw new BadRequestException('You already own this action.'); const member = await this.prisma.membership.findUnique({ where: { organisationId_userId: { organisationId: org, userId: parsed.data.userId } }, select: { id: true } }); if (!member) throw new BadRequestException('Choose a member of this workspace.'); return this.prisma.personalActionShare.upsert({ where: { actionItemId_userId: { actionItemId: id, userId: parsed.data.userId } }, create: { organisationId: org, actionItemId: id, userId: parsed.data.userId, access: parsed.data.access }, update: { access: parsed.data.access } }); }
  @Delete('personal-actions/:actionId/share/:userId')
  async unshareAction(@Req() req: AuthenticatedRequest, @Param('actionId') id: string, @Param('userId') targetUserId: string) { assertCanWrite(req); const { action, owner } = await this.actionAccess(id, this.org(req), this.user(req)); if (!owner) throw new ForbiddenException('Only the tracker owner can change sharing.'); await this.prisma.personalActionShare.deleteMany({ where: { organisationId: this.org(req), actionItemId: action.id, userId: targetUserId } }); return { unshared: true }; }
}
