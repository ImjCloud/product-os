import { NotFoundException } from '@nestjs/common';
import { AuditController } from './audit.controller';

describe('AuditController private action-item history', () => {
  const req: any = { organisationMembership: { organisationId: 'org-a', userId: 'user-b' } };
  let prisma: any;
  let controller: AuditController;

  beforeEach(() => {
    prisma = {
      actionItem: { findFirst: jest.fn().mockResolvedValue(null), findMany: jest.fn().mockResolvedValue([]) },
      auditLog: { findMany: jest.fn().mockResolvedValue([]) },
    };
    controller = new AuditController(prisma);
  });

  it('returns not found instead of disclosing private task history', async () => {
    await expect(controller.history(req, 'ActionItem', 'private-task')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.auditLog.findMany).not.toHaveBeenCalled();
  });

  it('excludes private task audit rows from the organisation-wide feed', async () => {
    await controller.list(req, {});
    expect(prisma.actionItem.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ organisationId: 'org-a', OR: expect.arrayContaining([{ visibility: 'SHARED' }, { createdById: 'user-b' }]) }),
    }));
    const auditQuery = prisma.auditLog.findMany.mock.calls[0][0];
    expect(auditQuery.where.AND).toEqual(expect.arrayContaining([
      expect.objectContaining({ OR: expect.arrayContaining([
        { entityType: { not: 'ActionItem' } },
        { entityType: 'ActionItem', entityId: { in: [] } },
      ]) }),
    ]));
  });
});
