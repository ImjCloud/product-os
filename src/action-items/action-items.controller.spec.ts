import { NotFoundException } from '@nestjs/common';
import { ActionItemsController } from './action-items.controller';

const actor = { organisationId: 'org-a', userId: 'user-b', role: 'OWNER' };
const req: any = { organisationMembership: actor };

describe('ActionItemsController private-task access', () => {
  let prisma: any;
  let controller: ActionItemsController;

  beforeEach(() => {
    prisma = {
      actionItem: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        deleteMany: jest.fn(),
      },
      auditLog: { findMany: jest.fn() },
      actionItemComment: { findMany: jest.fn(), create: jest.fn() },
      $transaction: jest.fn(),
    };
    controller = new ActionItemsController(prisma);
  });

  it('does not expose activity for another member private task', async () => {
    await expect(controller.activity(req, 'private-task')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.auditLog.findMany).not.toHaveBeenCalled();
    expect(prisma.actionItemComment.findMany).not.toHaveBeenCalled();
    expect(prisma.actionItem.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 'private-task', organisationId: 'org-a', OR: expect.arrayContaining([{ visibility: 'SHARED' }, { createdById: 'user-b' }]) }),
    }));
  });

  it('does not expose comments for another member private task', async () => {
    await expect(controller.listComments(req, 'private-task')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.actionItemComment.findMany).not.toHaveBeenCalled();
  });

  it('does not allow comments to be added to another member private task', async () => {
    const tx = {
      actionItem: { findFirst: jest.fn().mockResolvedValue(null) },
      actionItemComment: { create: jest.fn() },
      auditLog: { create: jest.fn() },
    };
    prisma.$transaction.mockImplementation((callback: (value: any) => unknown) => callback(tx));
    await expect(controller.addComment(req, 'private-task', { body: 'Should not be visible' })).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.actionItemComment.create).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it('does not allow deleting another member private task', async () => {
    await expect(controller.remove(req, 'private-task')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.actionItem.deleteMany).not.toHaveBeenCalled();
  });
});
