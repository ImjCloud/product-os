/** Shared visibility rule for action-item queries: workspace-shared tasks plus the caller's own private tasks. */
export function visibleActionItemFilter(userId: string) {
  return {
    OR: [
      { visibility: 'SHARED' as const },
      { createdById: userId },
    ],
  };
}


/** Attention query that preserves the caller's private-task boundary. */
export function visibleActionItemAttentionFilter(userId: string, now: Date = new Date()) {
  return {
    AND: [
      visibleActionItemFilter(userId),
      {
        OR: [
          { status: 'BLOCKED' as const },
          { priority: 'URGENT' as const, status: { not: 'DONE' as const } },
          { dueAt: { lt: now }, status: { not: 'DONE' as const } },
        ],
      },
    ],
  };
}
