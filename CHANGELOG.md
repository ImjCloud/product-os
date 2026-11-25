# Changelog

## Increment 6 — Product OS Web workspace

- Added a Next.js 15 / React 19 frontend application in `apps/web`.
- Added local sign-in and registration, organisation and product selection, product dashboard, feedback capture/search/status, requirements with RICE ordering, action-item board, release checklist, release decision log, KPI creation and updates, organisation member management, audit history and weekly digest.
- Added JSON backup export for the selected product.
- Added `POST /api/releases/:releaseId/decisions` with GO / CONDITIONAL_GO / NO_GO validation and audit logging.
- Added web Dockerfile and Compose service with API readiness dependency.
- Added Windows PowerShell start/stop scripts with local secret generation and migration application.
- Added setup, deployment, integration and verification documentation.

### Verification limits
- TypeScript / TSX syntax transpilation completed without syntax diagnostics.
- Package JSON and Docker Compose YAML parse checks passed.
- npm dependency installation timed out; Docker is unavailable in the build environment. Full framework builds, Jest tests, Prisma validation/migrations and browser tests remain unverified.

## Increment 7 — migration and identity foundation (2026-11-14)
- Added organisation-scoped legacy import preview and transactional commit endpoints.
- Added source fingerprinting to prevent importing the same exact legacy export twice.
- Added durable source-payload retention, audit events, project-to-product mapping, and relationship mapping for requirements/releases/metrics/action points.
- Mapped legacy action points into the current Action Items workflow rather than misclassifying them as customer feedback; preserved legacy source, segment, theme, sentiment, links and reference values in the action description and original source payload.
- Added a Migration workspace panel with preview, warnings, explicit confirmation and non-destructive import behaviour.
- Added Zod shape validation and mapper tests.
- Added optional Microsoft Entra browser sign-in/linking using MSAL, plus a backend linked-account sign-in endpoint.
- Added Entra build-time configuration to Docker Compose and updated API body/CORS defaults.
- Dependency installation and full runtime verification remain pending where the build environment cannot reach npm or Docker.
- Centralised and exported `OrganisationGuard` from `AuthModule` so every controller module that uses it receives the same configured guard provider at runtime.


## Increment 8 — workflow collaboration and KPI history
- Added action-item discussion threads with organisation-scoped comments and audit events.
- Added immutable KPI value snapshots on creation and actual-value changes, plus a metric history API.
- Added product name and description editing with audit history.
- Added UI for product settings, task discussions and KPI history.
- Added Prisma migration `20261114190000_add_history_and_comments`.

## Increment 8 — Workflow operations, notifications and historical digests
- Added organisation-scoped in-app notifications with unread/read state and mark-all-read.
- Action item assignments now notify the newly assigned workspace member.
- Added persisted product digest snapshots so weekly reviews can retain historical checkpoints.
- Added a Notifications workspace tab and digest snapshot history/save controls.
- Added safe bulk status updates for feedback and requirements (maximum 100 records per request, with same-product and same-organisation validation).
- Added product archive/restore API operations; archiving preserves all associated product records and active product lists exclude archived products.
- Added audit records for archive, restore, bulk updates and digest snapshots.
- Added PostgreSQL migrations for notifications, product archive state and digest snapshots.


## Increment 9 — archived product management
- Added an organisation-scoped API endpoint to list archived products.
- Added an Archived products workspace view with archive dates, descriptions and restore actions.
- Archiving a product now takes the user to archive management and refreshes both active and archived product lists.
- Restoring a product refreshes both lists and makes the restored product available in the active product selector.
- Added tenant- and product-scoped bulk action-item status updates with unique-ID validation and audit logging.
- Added action-item selection and bulk status controls to the Kanban board.

## Increment 10 — editable records and release collaboration
- Added a shared record-editing dialog for feedback triage metadata, full requirement detail and RICE fields, action-item ownership/status/priority/deadline, and release version/target date.
- Existing API validation and organisation-scoped update routes remain the source of truth; successful edits refresh the workspace and produce the existing audit events.
- Added week-over-week digest comparison across feedback, requirements, action items and release counts using the two most recent saved snapshots.
- Release decisions now generate in-app notifications for other organisation members; marking a release as RELEASED also notifies the workspace.
- Added responsive layout rules for the wider record editor.

### Verification limits
- TypeScript/TSX syntax transpilation completed for 55 source files with zero syntax diagnostics.
- Full type-check, Prisma client generation, API tests, migrations, Next.js build and browser tests remain unverified because dependencies and Docker are not available in this environment.


## Increment 11 — Mission Control and project foundations (2026-11-16)
- Added first-class Initiatives above requirements and action items, with outcome, description, owner label, target dates and delivery status.
- Added initiative milestones with due dates, completion state and ordering.
- Added organisation- and product-scoped initiative APIs, milestone APIs and audit history for initiative create/update/delete.
- Added requirement-to-initiative and action-to-initiative relationships, with same-product and same-organisation validation.
- Added an explicit action-item promotion/link endpoint that retains the original action record and writes a traceability audit event.
- Added a configurable per-product workflow-stage model and API, with a seven-stage default pathway: Intake, Discovery, Planning, Development, Testing & UAT, Release, Live & Monitoring. Gate flags and transition-rule JSON are stored for future workflow enforcement.
- Added server-side initiative stage transitions, transition history and configurable gate checks for blocked/open actions, requirement readiness and milestone completion.
- Added the first Mission Control Project Studio interface with initiative cards, milestone management, delivery pathway visualisation, stage transitions/history and workflow-stage configuration.
- Added KPI definition editing for name, unit, baseline, target, direction, review date and linked release. Definition changes create a KPI history snapshot with a descriptive note; value updates continue to create value snapshots.
- Expanded product JSON backup exports to include initiatives and workflow configuration.

### Increment 11 verification limits
- 57 TypeScript/TSX source files passed TypeScript syntax transpilation with zero syntax diagnostics. This is not a full type-check or application build.
- Prisma CLI/client are not installed in this environment and npm registry access is unavailable, so schema validation, client generation and database push/migrations cannot be executed here.
- Apply the updated Prisma schema to the local development database before using Initiative and Workflow features. The supplied source archive currently has no checked-in baseline migration SQL; use `npx prisma db push` for the local MVP database, not as a production migration strategy.


## Increment 12 — Document Intelligence Centre (2026-11-16)
- Added a document-intake workspace for XLSX, DOCX, searchable PDF, CSV and TXT files, with a 15 MB upload limit and SHA-256 duplicate detection within an organisation.
- Added built-in extraction for XLSX worksheets/cell values, DOCX document text, best-effort selectable PDF text, CSV and TXT.
- Retained original uploaded document bytes alongside extracted text, and added an organisation-scoped source download route.
- Added a reviewable candidate register that classifies extracted content as requirements, action items, feedback, decisions, risks, dependencies or questions, with heuristic confidence scores, rationale, sheet/row or paragraph/segment references, and best-effort owner, due-date and priority suggestions when explicitly stated in the source.
- Added human review controls to edit titles/details, correct classification, adjust confidence, add owner/due date/review notes, approve or reject candidates. Nothing is created automatically on upload.
- Added an explicit commit action that creates approved feedback, requirements and action items in the selected product, records the imported entity reference and writes an audit event. Other approved classifications remain in the review register pending their dedicated native modules.
- Added a Document Intelligence Centre interface with upload history, batch review, classification guidance and import progress.

### Increment 12 extraction and verification limits
- Legacy binary .xls and .doc files are not parsed; save them as .xlsx/.docx or CSV/PDF first.
- Scanned/image-only PDFs are not OCR processed. The extractor reports when no selectable text is found and instructs the reviewer to provide searchable text. OCR integration remains a future task.
- PDF page coordinates and original table geometry are not preserved; source references currently identify extracted segments, not authoritative page/paragraph coordinates.
- Classification is deterministic heuristic assistance, not an AI model. Confidence values are indicative and every candidate requires human review.
- Decision, risk, dependency and question candidates can be reviewed and retained, but are not yet promoted into dedicated first-class workspace entities.
- Full Prisma validation, type-check, Jest, database integration, Next.js build and browser E2E remain unverified in this offline environment.


### Increment 12 checks performed
- TypeScript/TSX syntax transpilation: 53 source files, zero syntax diagnostics (syntax-only, not a full type-check).
- Document extractor fixtures: minimal DOCX, XLSX and searchable-PDF fixtures all returned expected text.
- JSON configuration parsing and Docker Compose YAML parsing passed.
- Full Nest/Next type-checks and builds, Prisma schema validation/client generation, PostgreSQL integration and browser E2E were not run because project dependencies and Docker are unavailable in this build environment.

## 0.13.0 — Business analysis control registers (development batch)

- Added native, product-scoped Decision, Risk and Dependency records. These are distinct from action items and are not forced into a task workflow.
- Added organisation-guarded list/create/update API routes under `/products/:productId/analysis/:kind`.
- Added audit events for register creation and updates, including before/after snapshots.
- Added same-product/same-organisation initiative linking for the new records.
- Added a unified Analysis Registers workspace panel with separate decision, risk and dependency views.
- Risk records include cause, consequence, probability, impact, mitigation, contingency, owner and review date.
- Decision records include context, options considered, rationale, outcome, status and decision date.
- Dependency records include dependency type, external/internal party or item, owner, needed-by date and status.

This is a development increment. Apply the updated Prisma schema to a backed-up local development database and complete generated-client, API, browser and regression tests before relying on it.

## 0.14.0 — Expanded BA control registers

- Added stakeholder register with role, organisation/group, interest, influence rating and engagement approach.
- Added issue register with severity, status, impact, resolution and due date.
- Added change request register with reason, scope/schedule/cost/risk impact and review rationale.
- Extended the existing analysis register API and interface with the new record types.
- Added organisation/product/initiative relations, indexes and a forward-only SQL migration.
- Kept these records distinct from action items and from one another.

## 0.16.0 — Traceability & Delivery Assurance
- Added read-only requirement-centred traceability endpoint covering feedback, action items, initiatives, releases and test cases.
- Added product-level assurance snapshot covering requirement test coverage, latest test outcomes, release checklist completion, risks, issues, dependencies, change reviews, benefits and process analysis.
- Kept the feature additive: no schema migration, no duplicate generic work-item model, and no automatic record linking.

## 0.17.0 — 2026-11-19
- Added UAT cycle planning, participant tracking, acceptance criteria and formal decision capture.
- Linked test execution records to UAT cycles.
- Added append-only benefit measurement history and history review controls.
- Added additive database migration and integration guidance.

## 0.19.0 — Deployment Operations
- Added environment-aware deployment records, lifecycle controls, verification and rollback metadata.
- Added release-linked deployment API and workspace panel with audit history.

## 0.20.0 — 2026-11-19
- Stakeholder engagement history and product portfolio intelligence.
- Added append-only engagement records, audit events, and operational attention signals.

## 0.21.0 — Initiative Command View
- Consolidated explicitly linked initiative records into one read-only command view.
- Added milestone, testing, stakeholder follow-up, and benefit measurement visibility.
- No schema migration required.

## 0.22.0 — Evidence Centre & Benefits Intelligence
- Evidence metadata, traceability links and human verification.
- Benefits progress and historical measurement intelligence.


## Increment 23 — Requirements Quality Assurance
- Added a product-scoped requirements quality endpoint with checks for problem clarity, user need context, acceptance criteria testability, ownership and initiative traceability.
- Added title-similarity signals to help analysts identify possible duplicate requirements; no automatic merge or deletion is performed.
- Added a Requirements Quality workspace with finding severity, quality indicators, filters and explicit methodology limitations.
- Checks are deterministic heuristics and do not establish domain correctness, stakeholder agreement, feasibility or regulatory compliance.
- No database migration is required.
- TypeScript syntax transpilation passed for the changed controller and frontend files; full dependency-backed type-check, API tests and browser tests remain pending.


## 0.24.0 — Approval Workflow

See `CHANGELOG_INCREMENT_24.md`.


## Increment 25 — approval notifications and simpler inbox
- Approval submissions now notify the assigned approver in the in-app notification inbox.
- Approval decisions notify the requester.
- Notification writes share the approval database transaction.
- Approval inbox adds pending, assigned-to-me and overdue summaries, with explicit overdue labels.
- The approver selector excludes the current user to prevent a common self-approval error.
- Reuses the existing notification model; no migration required.

## 0.26.0 — My Work and Reporting Studio
- Added a personal work queue combining assigned open actions, assigned pending approvals and unread notifications.
- Added four read-only report templates with CSV export and browser print/PDF support.
- Added organisation-, product- and user-scoped queries; no schema migration required.
- Added initiative-focused report filtering where the current data model supports direct initiative links, with explicit product-level scope notes for unlinked delivery records.
- Full runtime/build verification remains pending; see `INCREMENT_26_GUIDE.md`.

## 0.27.0 — Workflow Stage Gate Readiness
- Added a read-only preview of initiative workflow gate readiness and outstanding blockers.
- Unified readiness preview and transition enforcement around the same gate-assessment logic.
- Added stage-gate visibility to Initiative Command; no schema migration required.
- Full runtime/build verification remains pending; see `INCREMENT_27_GUIDE.md`.


## Increment 28 — Personal Tracking & Selective Sharing

Private-by-default trackers and action points with individual or whole-tracker sharing, VIEW/EDIT access and progress history.

## 0.29.0 — Personal Follow-up Command Centre
- Added personal action summary cards and filters for active, overdue, due-soon, waiting and completed work.
- Added search across personal action points and tracker context.
- Added editing and deletion for personal action points, plus tracker editing and deletion for owners.
- Made recent progress history expandable and clarified its recent-entry limit.
- Reuses Increment 28 APIs and models; no migration required.
- Full typecheck/build/runtime verification remains pending; see `INCREMENT_29_GUIDE.md`.


## 0.30.0 — Meeting-to-Action Capture & Weekly Personal Review
- Added paste-and-preview meeting-note capture for personal action points.
- Added transactional bulk creation (maximum 50 actions per request) with server-side validation and tracker edit-access checks.
- Added seven-day personal activity, completion and due-soon summaries.
- No migration; no shared action records, assignments or notifications are created.
- See `INCREMENT_30_GUIDE.md` for privacy and verification details.


## Increment 31 — Personal Project Activity Timeline

- Added an access-scoped timeline for personal action creation, updates and status changes.
- Action metadata edits now leave a dated history entry.
- Added a chronological timeline to Personal Tracking.
- No database migration required.

## 0.32.0 — Personal Follow-up Scheduling
- Separated action target dates from personal follow-up dates.
- Added a private follow-up queue and today / this week / overdue filters.
- Added an additive database migration and access-scoped follow-up API.
- No email, push or background reminder service; queue is refreshed with the workspace.
- See `INCREMENT_32_GUIDE.md` for upgrade and verification details.


## Increment 33 — Personal Review & Progress Reporting

- Added a reviewable personal progress report with 7-day and 30-day windows.
- Added separate sections for completed actions, new work, progress updates, outstanding and waiting items, follow-ups and overdue attention points.
- Added copy, text download and print / save PDF. No automatic sharing or notifications.

## Increment 34 — Organisation Portfolio Overview
- Added an organisation-scoped portfolio overview across active products.
- Aggregates active initiatives, outstanding/overdue actions, open risks/issues/dependencies, pending decisions and pending change requests.
- Added a searchable product table with direct navigation into each product workspace.
- Archived products are excluded; the overview is a factual operational snapshot, not an inferred health score.

## Increment 35 — Actionable Organisation Portfolio Attention
- Added a bounded organisation-wide attention list for overdue actions, open risks/issues, pending decisions, unresolved dependencies and pending change requests.
- Portfolio attention items now open the corresponding product workspace and relevant register, with the selected record brought into view.
- Preserved organisation membership and active-product scoping; no database migration required.
- See `INCREMENT_35_GUIDE.md` for scope and verification notes.

## 0.36.0 — Beginner-first workspace experience
- Simplified default navigation and moved specialist destinations into an expandable More tools section without removing access.
- Added a plain-language starting guide linking common BA activities to existing workflows.
- Collapsed product configuration and clarified that workspaces can represent products, services, systems or business improvements.
- No database migration or API changes.
- See `INCREMENT_36_GUIDE.md` for details.

## 0.38.0 — Verification and Release Tooling
- Added repeatable source verification and a Windows release-check script.
- API Docker build now uses the committed npm lockfile through `npm ci`.
- No database migration or feature changes.


## 0.39.0 — Authentication Hardening

- Added IP-based rate limits to local registration, local login and Microsoft sign-in/link endpoints, with standard rate-limit and retry headers.
- Added one-hour Microsoft Entra JWKS caching, in-flight request coalescing, unknown-key refresh for key rotation, and a five-second key-fetch timeout.
- Strengthened common JWT time-claim validation for not-before and implausibly future-issued tokens.
- Added focused rate-limiter unit tests and updated authentication/deployment security documentation.
- No database migration.
- Limitation: the application rate limiter is process-local; production must also enforce distributed limits at the gateway/WAF.

## 0.40.0 — Runtime Configuration & Abuse-Resistance Hardening
- Added fail-fast startup validation for JWT secret strength, database URL, explicit CORS origins, and HTTPS origins in production.
- Bounded the in-memory authentication rate-limit map to prevent unbounded growth from high-cardinality client addresses.
- Added configuration validation unit tests.
- No database schema or migration changes.
