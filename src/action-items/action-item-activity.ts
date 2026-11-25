type Actor = { id: string; name: string | null; email: string } | null;
type AuditRecord = {
  id: string;
  action: string;
  createdAt: Date | string;
  actor?: Actor;
  before?: unknown;
  after?: unknown;
};
type CommentRecord = {
  id: string;
  body: string;
  createdAt: Date | string;
  author: NonNullable<Actor>;
};

const TRACKED_FIELDS: Record<string, string> = {
  title: 'Title',
  description: 'Description',
  status: 'Status',
  priority: 'Priority',
  visibility: 'Visibility',
  assigneeId: 'Assignee',
  assigneeLabel: 'Assignee label',
  dueAt: 'Due date',
  feedbackId: 'Linked feedback',
  requirementId: 'Linked requirement',
  releaseId: 'Linked release',
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function changedLabels(before: unknown, after: unknown): string[] {
  const previous = asRecord(before);
  const next = asRecord(after);
  return Object.entries(TRACKED_FIELDS)
    .filter(([field]) => JSON.stringify(previous[field] ?? null) !== JSON.stringify(next[field] ?? null))
    .map(([, label]) => label);
}

export type ActionItemActivity = {
  id: string;
  type: 'audit' | 'comment';
  action: string;
  summary: string;
  body?: string;
  actor: Actor;
  createdAt: Date | string;
};

export function buildActionItemActivity(
  audits: AuditRecord[],
  comments: CommentRecord[],
): ActionItemActivity[] {
  const auditItems: ActionItemActivity[] = audits
    .filter(event => event.action !== 'COMMENT_ADDED' && event.action !== 'BULK_STATUS_UPDATED')
    .map(event => {
      const labels = event.action === 'UPDATED' ? changedLabels(event.before, event.after) : [];
      const summary = event.action === 'CREATED'
        ? 'Created the task'
        : event.action === 'UPDATED'
          ? labels.length ? `Updated ${labels.join(', ')}` : 'Updated the task'
          : event.action === 'DELETED'
            ? 'Deleted the task'
            : event.action.replaceAll('_', ' ').toLowerCase();
      return {
        id: `audit:${event.id}`,
        type: 'audit' as const,
        action: event.action,
        summary,
        actor: event.actor ?? null,
        createdAt: event.createdAt,
      };
    });

  const commentItems: ActionItemActivity[] = comments.map(comment => ({
    id: `comment:${comment.id}`,
    type: 'comment',
    action: 'COMMENTED',
    summary: 'Added a comment',
    body: comment.body,
    actor: comment.author,
    createdAt: comment.createdAt,
  }));

  const timestamp = (value: Date | string) => value instanceof Date ? value.getTime() : new Date(value).getTime();
  return [...auditItems, ...commentItems]
    .sort((a, b) => timestamp(b.createdAt) - timestamp(a.createdAt))
    .slice(0, 100);
}
