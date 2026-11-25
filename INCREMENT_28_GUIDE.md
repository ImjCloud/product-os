# Increment 28 — Personal Tracking & Selective Sharing

## Purpose
Give a business analyst or other individual contributor a genuinely private way to follow a project and update action points without creating team assignments, involving collaborators, or triggering notifications.

## User experience
- A new **Personal Tracking** area is available from the HOME navigation group.
- Create a private tracker for a project, meeting, review session or follow-up list.
- Add personal action points with optional descriptions, priority and target dates.
- Update status independently of the shared action register.
- Add dated progress notes; status changes and progress notes are retained in an update history.
- Private trackers are visible only to their owner unless explicitly shared.
- Share an entire tracker with a selected workspace member, or share an individual action point without exposing the rest of its private tracker.
- Sharing supports VIEW and EDIT access. Owners can revoke access.
- Sharing does not send notifications or create assignments, approvals or comments in the shared action register.

## Data and security
- Personal tracking uses dedicated database models, separate from shared ActionItem records.
- Every API query is scoped to the authenticated organisation membership and selected product.
- Tracker and action access is checked server-side for reads, updates, progress notes, deletion and sharing.
- A share target must already be a member of the selected organisation.
- Private-by-default is represented by the absence of share records.
- Deleting a tracker cascades to its personal action points, shares and update history.

## Database migration
`20261119170000_personal_tracking`

Apply through the normal deployment workflow (`npx prisma migrate deploy`) after generating the Prisma client. Do not use `db push` as a substitute for the migration in a production environment.

## Verification limitations
The source archive can be inspected and syntax-checked, but a full dependency-backed Prisma validation, generated-client typecheck, API test suite and browser build must still be run in the user's development environment.
