# Product OS 2.0 — Increment 25: Approval Notifications & Simpler Inbox

Version: 0.25.0

## Purpose
Make approval work easier to see and act on without introducing a separate notification configuration process.

## Included
- Creating an approval request now creates an in-app notification for the assigned approver.
- Approving or rejecting a request notifies the original requester.
- Notification creation happens in the same database transaction as the approval change, so the approval and its notification cannot silently diverge.
- The Approvals workspace now shows pending, assigned-to-me and overdue counts.
- Pending requests past their due date are explicitly labelled overdue.
- The approver selector excludes the signed-in user, reducing avoidable self-approval validation errors.
- Existing approval authorisation, rationale requirements and audit history remain in place.
- No database migration is required; the existing Notification model and inbox are reused.

## Behaviour and limits
- Notifications are in-app only. Email, push, scheduled reminders and escalation are not included.
- Overdue status is calculated when the workspace loads; it does not imply a scheduled background job.
- Approval decisions still do not automatically change the underlying target record.
- Notifications are written only to the assigned approver and requester, and remain organisation-scoped.

## Verification performed
- Changed API controller and React component syntax transpilation.
- Package JSON and lockfile JSON parsing.
- Static confirmation that the notification writes use the existing Notification model.
- ZIP integrity check.

Full TypeScript type-check, Prisma generation, API integration tests, database execution and browser tests remain to be run in the local development environment.
