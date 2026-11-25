import { visibleActionItemAttentionFilter, visibleActionItemFilter } from './action-item-access';

describe('visibleActionItemFilter', () => {
  it('includes shared tasks and only the caller-owned private tasks', () => {
    expect(visibleActionItemFilter('user-123')).toEqual({
      OR: [
        { visibility: 'SHARED' },
        { createdById: 'user-123' },
      ],
    });
  });
});


describe('visibleActionItemAttentionFilter', () => {
  it('combines attention conditions with the caller-specific visibility boundary', () => {
    const now = new Date('2026-11-23T18:00:00.000Z');
    expect(visibleActionItemAttentionFilter('user-123', now)).toEqual({
      AND: [
        { OR: [{ visibility: 'SHARED' }, { createdById: 'user-123' }] },
        { OR: [
          { status: 'BLOCKED' },
          { priority: 'URGENT', status: { not: 'DONE' } },
          { dueAt: { lt: now }, status: { not: 'DONE' } },
        ] },
      ],
    });
  });
});
