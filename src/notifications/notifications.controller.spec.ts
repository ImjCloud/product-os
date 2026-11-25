import { NotFoundException } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';

describe('NotificationsController private action-item notifications', () => {
  const req: any = { organisationMembership: { organisationId: 'org-a', userId: 'user-b' } };
  let prisma: any;
  let controller: NotificationsController;

  beforeEach(() => {
    prisma = {
      actionItem: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn().mockResolvedValue(null) },
      notification: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn().mockResolvedValue(null), update: jest.fn() },
    };
    controller = new NotificationsController(prisma);
  });

  it('limits notification feed to action items visible to the recipient', async () => {
    await controller.list(req);
    expect(prisma.actionItem.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ organisationId: 'org-a', OR: expect.arrayContaining([{ visibility: 'SHARED' }, { createdById: 'user-b' }]) }),
    }));
    expect(prisma.notification.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ organisationId: 'org-a', userId: 'user-b', OR: expect.arrayContaining([
        { entityType: null }, { entityType: { not: 'ActionItem' } }, { entityType: 'ActionItem', entityId: { in: [] } },
      ]) }),
    }));
  });

  it('does not mark an inaccessible private-task notification as read', async () => {
    prisma.notification.findFirst.mockResolvedValue({ id: 'n-1', entityType: 'ActionItem', entityId: 'private-task', readAt: null });
    await expect(controller.markRead(req, 'n-1')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.actionItem.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 'private-task', organisationId: 'org-a', OR: expect.arrayContaining([{ visibility: 'SHARED' }, { createdById: 'user-b' }]) }),
    }));
    expect(prisma.notification.update).not.toHaveBeenCalled();
  });
});
