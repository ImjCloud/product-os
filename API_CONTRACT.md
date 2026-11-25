# Products & Feedback API — increment 2

All routes are prefixed with `/api` and protected by `OrganisationGuard`.

## Authentication boundary — required before deployment
The guard expects a verified authentication layer to populate `request.user.sub`.
That OIDC/session/JWT authentication integration is not included yet. Without it the
routes fail closed with HTTP 401. Never accept a user ID from a caller-controlled header.

Clients also send `x-organisation-id` as a tenant selector. The server verifies a real
Membership row for the authenticated user before a handler runs; the header alone grants
no access.

## Routes

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/products` | List products in the verified organisation |
| POST | `/api/products` | Create product and audit event |
| GET | `/api/products/:productId/feedback` | List feedback for an organisation-owned product |
| POST | `/api/products/:productId/feedback` | Create feedback and audit event |
| PATCH | `/api/feedback/:feedbackId` | Update status, owner, severity or theme; audit before/after |

OWNER, ADMIN, PRODUCT_MANAGER and CONTRIBUTOR can write. VIEWER is read-only.
Payloads are validated with Zod. Mutation and audit insert run in one database transaction.

Example product payload: `{ "name": "Customer Portal", "description": "Self-service product" }`

Example feedback payload: `{ "text": "Large exports time out", "source": "Support", "severity": "HIGH" }`

Example update: `{ "status": "IN_PROGRESS", "owner": "Product Operations" }`

## Requirements & Backlog API — increment 3

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/products/:productId/requirements` | List requirements; optional `?status=DISCOVERY\|SCOPED\|IN_BUILD\|SHIPPED` |
| POST | `/api/products/:productId/requirements` | Create a requirement and audit event |
| GET | `/api/products/:productId/backlog` | Return unshipped requirements ordered by descending RICE score |
| PATCH | `/api/requirements/:requirementId` | Update requirement fields and audit before/after |

RICE score is calculated as `(reach × impact × confidence / 100) / effort` and rounded to one decimal place. Defaults match the current data model: reach 100, impact 1, confidence 50, effort 2. Effort must be greater than zero; confidence is constrained to 0–100; impact is constrained to 0–10.

A linked release must belong to the same product and organisation. A requirement is always scoped to the verified organisation and product. The backlog excludes `SHIPPED` items; the requirements list includes all statuses unless a status filter is supplied.

Example create payload:

```json
{
  "title": "Improve onboarding completion",
  "problem": "New users abandon the setup flow",
  "userStory": "As a new user, I want guided setup so I can complete onboarding",
  "acceptance": "A user can complete setup with a progress indicator",
  "reach": 500,
  "impact": 2,
  "confidence": 80,
  "effort": 4
}
```


## Authentication

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Create a local account (12+ character password); returns a one-hour bearer token. |
| POST | `/api/auth/login` | Authenticate a local account; returns a one-hour bearer token. |
| GET | `/api/auth/me` | Return the authenticated profile. |
| POST | `/api/auth/link/microsoft` | Explicitly link an Entra identity to the current local account. |

For Microsoft Entra, the client obtains a v2 **API access token** through MSAL and sends it as `Authorization: Bearer <token>`. Both authentication methods must also provide `x-organisation-id` on organisation-scoped routes. A verified identity without an organisation Membership is denied. See AUTHENTICATION.md.


## Organisations
- `GET /api/organisations` — list memberships for the authenticated user.
- `POST /api/organisations` — create an organisation; creator becomes OWNER.

## Releases
- `GET /api/products/:productId/releases`
- `POST /api/products/:productId/releases` — creates the default release checklist.
- `GET /api/releases/:releaseId/readiness` — checklist completion and readiness.
- `PATCH /api/releases/:releaseId` — cannot mark READY while checklist items remain.
- `PATCH /api/releases/:releaseId/checks/:checkId`

## Metrics and overview
- `GET /api/products/:productId/metrics`
- `POST /api/products/:productId/metrics`
- `PATCH /api/metrics/:metricId`
- `GET /api/products/:productId/overview` — feedback, requirement, release, action-item and metric summaries.

## Audit
- `GET /api/audit?entityType=&entityId=&limit=`
- `GET /api/audit/:entityType/:entityId`

All organisation-scoped routes require a Bearer token and a valid `X-Organisation-Id` membership. Mutations require a writable membership role and create audit entries.

### Organisation members
- `GET /api/organisations/:organisationId/members`
- `POST /api/organisations/:organisationId/members` — adds an existing Product OS account by email. This is not yet an email invitation flow.
- `PATCH /api/organisations/:organisationId/members/:userId` — changes non-owner role. Only OWNER can promote to ADMIN.
- `DELETE /api/organisations/:organisationId/members/:userId` — removes a non-owner member.

### Identity and profile additions
- `GET /api/auth/me` — current authenticated profile.
- `POST /api/auth/link/microsoft` — explicitly links a Microsoft Entra access token to the currently authenticated local account; email must match. Microsoft sign-in no longer silently links an existing local account by email.


## Action items
- `GET /api/products/:productId/action-items?status=&priority=`
- `POST /api/products/:productId/action-items`
- `PATCH /api/action-items/:actionItemId`
- `DELETE /api/action-items/:actionItemId`

Action items can be assigned to an existing organisation member and linked to feedback, requirements or releases in the same product. All mutations are audited.

## Web client integration notes
The Next.js client calls the existing endpoints using `Authorization: Bearer <accessToken>` and `X-Organisation-Id: <selected organisation id>`. It uses `GET /auth/me`, `GET/POST /organisations`, `GET /products`, and the product-scoped feedback, requirements, action-items, releases, metrics, overview and audit endpoints. Organisation member management uses `/organisations/:organisationId/members`. JSON backup export is client-side and read-only; no import endpoint is exposed yet.
- `POST /api/releases/:releaseId/decisions` — append a GO, CONDITIONAL_GO or NO_GO decision with rationale and optional owner; records an audit event.


## Increment 8 additions
- `PATCH /api/products/:productId` — update product name and/or description.
- `GET /api/action-items/:actionItemId/comments` — list comments for an organisation-scoped action item.
- `POST /api/action-items/:actionItemId/comments` — add a comment (`body`, 1–5000 characters).
- `GET /api/metrics/:metricId/history` — retrieve KPI value snapshots in chronological order.

KPI creation records an initial snapshot. Updating the actual value records a new immutable snapshot. Changes to target/baseline without an actual-value change do not create a value-history point.

## Increment 8 endpoints

- `GET /api/notifications` — list the signed-in member's notifications for the selected organisation.
- `PATCH /api/notifications/:notificationId/read` — mark one notification as read.
- `POST /api/notifications/read-all` — mark all of the member's notifications in the organisation as read.
- `POST /api/notifications` — create an organisation-scoped notification for an existing member (writer roles only).
- `POST /api/products/:productId/feedback/bulk-update` — update status for 1–100 feedback records belonging to the product.
- `POST /api/products/:productId/requirements/bulk-update` — update status for 1–100 requirements belonging to the product.
- `POST /api/products/:productId/archive` and `POST /api/products/:productId/restore` — archive or restore a product without deleting its records.
- `GET /api/products/:productId/digest-snapshots` and `POST /api/products/:productId/digest-snapshots` — list and save historical digest checkpoints.

All routes use the organisation membership guard. Bulk operations validate every supplied record against the active organisation and product before applying changes.

## Increment 9 additions
- `GET /api/products/archived` — list archived products in the selected organisation, including archive timestamps.
- `POST /api/products/:productId/action-items/bulk-update` — update status for 1–100 unique action-item IDs. Every item must belong to the selected organisation and product; the operation is audited.

The workspace now includes an Archived products view with restore actions and bulk status controls on the Action items board.

## Increment 10 notification events
- `POST /api/releases/:releaseId/decisions` now creates `RELEASE_DECISION` notifications for other members of the organisation.
- `PATCH /api/releases/:releaseId` creates `RELEASED` notifications for other organisation members when the release first transitions to `RELEASED`.
- Notification writes are committed in the same database transaction as the release update/decision and remain organisation-scoped.


## Initiatives and workflow (Increment 11)
- `GET /products/:productId/initiatives` — list initiatives with milestones and linked requirement/action counts.
- `POST /products/:productId/initiatives` — create an initiative.
- `PATCH /initiatives/:initiativeId` — update initiative details, status and dates.
- `DELETE /initiatives/:initiativeId` — delete an initiative; linked requirements/actions are retained and unlinked by the database relation.
- `POST /initiatives/:initiativeId/milestones` — add a milestone.
- `PATCH /milestones/:milestoneId` — update milestone status, date, description or order.
- `POST /action-items/:actionItemId/promote` — link an existing action item to an initiative in the same product and organisation; no duplicate task is created.
- `GET /products/:productId/workflow-stages` — return configured stages or the default seven-stage pathway.
- `POST /products/:productId/workflow-stages` — replace the product workflow stage configuration (2–20 stages).
- Requirement create/update accepts `initiativeId`; action-item create/update accepts `initiativeId`. Both validate same-product and same-organisation membership.
- KPI definition updates record a history snapshot at the current actual value with a note identifying the changed definition fields.

- `POST /initiatives/:initiativeId/transition` — move an initiative to an active workflow stage. Gate stages evaluate configured rules before allowing the transition.
- `GET /initiatives/:initiativeId/transitions` — return the organisation-scoped stage transition history and actor details.
- Supported gate rules: `requireNoBlockedActions`, `requireNoOpenActions`, `requireAllRequirementsScoped`, `requireAllRequirementsShipped`, `requireAllMilestonesCompleted`. Rules are evaluated only when the destination stage is marked as a gate.


## Document Intelligence (Increment 12)
- `POST /document-intelligence/upload` — multipart upload with `file` and `productId` fields. Supports `.xlsx`, `.docx`, searchable `.pdf`, `.csv` and `.txt`; maximum file size 15 MB. Uploads are extracted and staged for review; no workspace records are created at this stage. Exact-file SHA-256 duplicates within an organisation return HTTP 409 with the prior import ID.
- `GET /document-intelligence/products/:productId/imports` — list the product's import batches and candidate review records.
- `GET /document-intelligence/imports/:importId/source` — download the original retained source document, scoped to the active organisation.
- `PATCH /document-intelligence/candidates/:candidateId` — update candidate title, description, classification, confidence, owner label, due date, review note and review status (`NEEDS_REVIEW`, `APPROVED`, `REJECTED`).
- `POST /document-intelligence/imports/:importId/commit` — create approved feedback, requirements and action items in the import's product. Imported candidate records retain their native entity ID/type. Decision, risk, dependency and question candidates remain approved in the import register until their dedicated entity modules are introduced.
- Classification types: `REQUIREMENT`, `ACTION_ITEM`, `FEEDBACK`, `DECISION`, `RISK`, `DEPENDENCY`, `QUESTION`. Confidence bands: `HIGH`, `MEDIUM`, `LOW`; confidence is heuristic and not a probability. Candidate source references identify workbook sheet/row, DOCX paragraph, CSV row or extracted PDF/text segment where possible. Explicit owner labels, due dates and priority terms are prefilled when the source wording matches supported patterns.
- All routes require organisation membership. Writes require a role permitted by `assertCanWrite`; product, import and candidate access is organisation-scoped. Original source bytes and extracted text are retained with each batch; upload, review and commit activity is audited.

## Increment 26 — Personal work and reporting

### Personal work queue
`GET /products/:productId/my-work`

Returns a read-only personal queue for the authenticated organisation member: open action items assigned to the current user, pending approvals assigned to the current user, and unread notifications for the current user in the selected organisation. The response includes overdue counts. Action items and approvals are product-scoped; notifications are organisation-scoped.

### Ready-made reports
`GET /products/:productId/reports/:reportType`

Supported `reportType` values: `DELIVERY`, `REQUIREMENTS`, `RAID`, and `UAT`. An optional `initiativeId` query parameter focuses records on an initiative where the underlying record type has a direct initiative relationship. Product-level records that cannot be attributed to an initiative are explicitly identified in the delivery report. Reports are read-only and generated from current records; they are not persisted as a second copy of the data.
