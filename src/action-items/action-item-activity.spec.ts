import { buildActionItemActivity } from './action-item-activity';

describe('buildActionItemActivity', () => {
  const actor = { id: 'user-1', name: 'A User', email: 'a@example.com' };

  it('merges comments and audit events in newest-first order', () => {
    const result = buildActionItemActivity(
      [{ id: 'audit-1', action: 'CREATED', createdAt: '2026-11-20T09:00:00.000Z', actor }],
      [{ id: 'comment-1', body: 'Please confirm the test result.', createdAt: '2026-11-20T10:00:00.000Z', author: actor }],
    );
    expect(result.map(item => item.id)).toEqual(['comment:comment-1', 'audit:audit-1']);
    expect(result[0].body).toBe('Please confirm the test result.');
  });

  it('summarises changed fields without returning raw before/after payloads', () => {
    const result = buildActionItemActivity(
      [{
        id: 'audit-2', action: 'UPDATED', createdAt: '2026-11-20T11:00:00.000Z', actor,
        before: { title: 'Review UAT', status: 'TODO', priority: 'MEDIUM', visibility: 'PRIVATE' },
        after: { title: 'Review UAT evidence', status: 'IN_PROGRESS', priority: 'HIGH', visibility: 'SHARED' },
      }],
      [],
    );
    expect(result[0].summary).toBe('Updated Title, Status, Priority, Visibility');
    expect(result[0]).not.toHaveProperty('before');
    expect(result[0]).not.toHaveProperty('after');
  });

  it('does not duplicate comment audit entries', () => {
    const result = buildActionItemActivity(
      [{ id: 'audit-comment', action: 'COMMENT_ADDED', createdAt: '2026-11-20T11:00:00.000Z', actor }],
      [],
    );
    expect(result).toHaveLength(0);
  });
});
