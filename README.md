# Product OS 2.0 — Backend Foundation

This repository is the multi-tenant backend foundation for migrating the original Product OS single-file prototype into a maintainable application. The original prototype is preserved unchanged at `legacy/Product OS.html`.

## Technology
- Node.js 22 and TypeScript
- NestJS API
- PostgreSQL and Prisma ORM
- Zod request validation
- Local email/password authentication and Microsoft Entra ID bearer-token validation

## Implemented modules
- **Authentication:** registration, login, current profile, explicit Microsoft account linking, Entra identity resolution.
- **Organisations and members:** create organisation, list memberships, add existing accounts, change roles and remove eligible members.
- **Products and feedback:** existing API foundation for product and feedback records.
- **Requirements and backlog:** CRUD, RICE validation, prioritised backlog and audit history.
- **Action items:** CRUD, status, priority, assignee, due date, feedback/requirement/release links and audit history.
- **Releases:** create/list/update, default readiness checklist, checklist completion and release-state enforcement.
- **Metrics:** CRUD, higher/lower-is-better KPI progress and target validation.
- **Overview and audit:** product-level status summaries and organisation-scoped audit history.
- **Operations:** CORS allow-list, security headers, liveness/readiness endpoints, Dockerfile and Compose setup.

## Setup
1. Install Node.js 22+ and PostgreSQL 16+ (or Docker Desktop).
2. Copy `.env.example` to `.env` and configure `DATABASE_URL`, a random `JWT_SECRET` of at least 32 characters, `CORS_ORIGINS`, and Entra settings if Microsoft sign-in is required.
3. Install packages: `npm install`.
4. Generate Prisma client: `npm run prisma:generate`.
5. Apply migrations: `npm run db:deploy`.
6. Start development server: `npm run start:dev`.
7. Check `GET /api/health` and `GET /api/health/ready`.

For active schema development, use `npm run prisma:migrate`. Do not use `db push` as a production migration strategy. The checked-in migration SQL has not yet been executed against a live PostgreSQL instance in this workspace; validate it before production deployment.

## Docker
Copy `.env.example` to `.env`, set strong secrets and run `docker compose up --build`. Apply migrations using `docker compose run --rm api npx prisma migrate deploy`.

## Documentation
- `API_CONTRACT.md` — endpoint inventory.
- `AUTHENTICATION.md` — local and Microsoft Entra identity setup.
- `DEPLOYMENT.md` — local, Docker and production setup guidance.
- `MIGRATION_MAP.md` — prototype-to-database mapping and migration safeguards.
- `INSTALL_STATUS.md` — dependency installation and verification status.
- `NEXT_STEPS.md` — remaining implementation priorities.

## Verification boundary
The latest source-level audit checked 89 TypeScript/TSX files for syntax and parsed 7 JSON files successfully. Dependency-backed typechecking, Jest, Prisma validation/generation, PostgreSQL migration rehearsal, production builds and browser E2E remain outstanding. See `FINAL_AUDIT.md` for the current release blockers and verification boundary.

## Important production gaps
- Email invitation and acceptance flow; member addition currently requires an existing Product OS account.
- Password reset, email verification, login throttling, refresh-token rotation and revocation.
- Entra JWKS caching and complete browser sign-in flow.
- PostgreSQL integration tests for tenant isolation and role enforcement.
- Next.js frontend and API-backed replacement for prototype localStorage.
- Outlook and Teams ingestion, secure OAuth token storage and sync monitoring.
- Validated JSON import/export and migration reconciliation.

Do not expose the service to real customer data until the production gaps and checks in `DEPLOYMENT.md` have been addressed.

## Web application (new)
A Next.js 15 / React 19 UI is now included in `apps/web`. It provides local sign-in/registration, organisation and product selection, dashboard, feedback, requirements/backlog, action items, releases, KPIs, member management, audit history and JSON backup export.

- Local API: `http://localhost:3000/api`
- Local web UI: `http://localhost:3001`
- Start UI separately: `cd apps/web && npm install && npm run dev`
- Docker stack: configure `.env`, then `docker compose up --build`; web UI is exposed on port 3001.

The UI currently uses a session-scoped bearer token. This is an MVP integration, not the final production session design. Move to HttpOnly secure cookies and CSRF protection before production. Microsoft Entra browser redirect, invitations, password recovery and safe server-side import are still outstanding. See `apps/web/README.md`.

## Windows quick start
With Docker Desktop installed and running, open PowerShell in the project folder and run:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\start-product-os.ps1
```

The script creates a local `.env` with generated secrets, starts PostgreSQL, builds both applications, applies database migrations and starts the web/API services. Open `http://localhost:3001`. To stop containers without deleting database data, run `./stop-product-os.ps1`.

## Increment 7 additions

- Open **Migration** in the workspace navigation to preview and import the original `product-os-v1` browser export. See [LEGACY_IMPORT.md](./LEGACY_IMPORT.md) for the export steps and field mapping.
- Microsoft Entra sign-in/linking is optional and configured with the `ENTRA_*` and `NEXT_PUBLIC_ENTRA_*` environment variables. The web app must be rebuilt after changing public Entra settings.
- Import commits are organisation-scoped, transactional, audited, fingerprinted against exact repeats, and non-destructive. The original payload is retained in the import audit record.


### Increment 8 additions
- Product name and description editing.
- Organisation-scoped action-item comments and discussion threads.
- KPI value history: initial values and subsequent actual-value changes are stored as immutable snapshots.
- Apply migration `20261114190000_add_history_and_comments` with `npm run db:deploy` before using these additions.


## Increment 8 additions
The current build includes in-app notifications (including task assignment alerts), bulk status updates for feedback and requirements, product archive/restore API operations, and saved digest snapshots for historical product-review checkpoints. See `API_CONTRACT.md` for routes and `NEXT_STEPS.md` for remaining work.


## Increment 9
This release adds an Archived products management view (including restore), plus audited bulk status updates for action items. See API_CONTRACT.md and CHANGELOG.md.


## Latest development increment
Increment 10 adds editable feedback, requirement, action-item and release records; saved-digest week-over-week comparisons; and release decision/shipping notifications. See `CHANGELOG.md` and `NEXT_STEPS.md` for scope and remaining verification work.

The current source is an actively developed MVP foundation, not a production-certified deployment. See `FINAL_AUDIT.md` before planning a release.


## Increment 11 — Mission Control / Project Studio
The current development increment adds outcome-led Initiatives, milestones, requirement/action traceability, configurable product workflow stages and KPI definition editing. The default delivery pathway is Intake → Discovery → Planning → Development → Testing & UAT → Release → Live & Monitoring. Workflow stages are configurable per product. Initiative transitions are recorded, and configured gate rules can block movement when action items, requirements or milestones have not met the configured conditions.

For a local development database, after pulling this increment run `npx prisma generate` and `npx prisma db push` from the project root before starting the API. The Windows startup script performs the local schema sync automatically. This project archive does not currently include a complete migration baseline, so `db push` is a local MVP schema-sync step only; establish and test a migration baseline before production deployment.


## Increment 12 — Document Intelligence Centre
The Document Intelligence tab stages uploaded documents for human review. It currently extracts XLSX, DOCX, searchable PDF, CSV and TXT. The review queue classifies text into requirements, action items, feedback, decisions, risks, dependencies and questions. Reviewers can edit each candidate and explicitly approve or reject it. Approved feedback, requirements and action items can then be committed into the selected product.

This is a controlled extraction MVP: legacy `.xls` / `.doc` conversion and OCR for scanned PDFs are not included; PDF source references are extracted-segment references rather than page coordinates; classification is heuristic, not AI; and decisions/risks/dependencies/questions remain in the review register until their native modules are delivered.

## Increment 17 — UAT operations and benefit measurement history

See `INCREMENT_17_GUIDE.md` before integrating this increment. It adds UAT cycles and append-only benefit observations. Back up the database, verify migration history, validate Prisma, and use `prisma migrate deploy`; do not use `db push` on an existing installation.

## Deployment operations (Increment 19)
Plan and track deployment attempts for READY releases across development, test, staging and production environments. Deployment records capture owners, planned and actual timestamps, rollback plans, verification notes and failure reasons. Product OS records deployment operations; it does not execute CI/CD pipelines or deploy software remotely. See `INCREMENT_19_GUIDE.md` before applying the additive migration.

## Increment 20 — Stakeholder Engagement & Portfolio Intelligence

See `INCREMENT_20_GUIDE.md` for the stakeholder engagement history, portfolio intelligence endpoint, migration and known limitations.

### Increment 21 — Initiative Command View
See `INCREMENT_21_GUIDE.md` for the consolidated initiative view, API route, data boundaries, and validation status.

## Increment 22
See `INCREMENT_22_GUIDE.md` for Evidence Centre and Benefits Intelligence, API routes, migration and validation boundaries.


## Increment 23 — Requirements Quality Assurance

See `INCREMENT_23_GUIDE.md` for the rule-based requirements quality review, potential duplicate signals, API contract and limitations. Quality scores are heuristic prompts for BA review, not approval or compliance decisions.


## Increment 24 — Approval Workflow

Increment 24 adds auditable approval requests for key product and delivery records. See `INCREMENT_24_GUIDE.md` for endpoints, security rules and current limitations.


## Increment 39 — Authentication hardening

Public authentication endpoints now have basic per-process IP request limits. Microsoft Entra signing keys are cached with key-rotation refresh and a bounded fetch timeout. JWT time claims and the tenant identity mapping are checked more strictly. The in-memory limiter is not distributed protection; add gateway/WAF limits for production. See `INCREMENT_39_GUIDE.md`, `AUTHENTICATION.md` and `FINAL_AUDIT.md`.
