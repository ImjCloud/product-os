# Product OS 2.0 — next development priorities

## Completed in Increment 7
- Legacy localStorage export preview and transactional import, including project/product and requirement/release/metric/action-point relationships.
- Import fingerprinting, duplicate prevention, warnings, audit history and original payload retention.
- Migration UI in the workspace.
- Optional Microsoft Entra browser login and account linking via MSAL.
- Mapper unit-test coverage and updated deployment configuration.

## Remaining before production
1. **Microsoft Graph ingestion:** implement delegated Mail.Read and Teams chat/channel permissions, consent, source/date/keyword selection, duplicate detection, and a review-before-import experience. Entra sign-in alone does not grant Graph data access.
2. **Authentication hardening:** replace browser sessionStorage bearer tokens with HttpOnly, Secure, SameSite cookies and CSRF protection; add refresh-token rotation/revocation, password reset, email verification, rate limiting and account recovery.
3. **Workflow UX:** complete rich edit dialogs for every entity, bulk actions, server-side pagination/filtering, and historical digest snapshots.
4. **Testing:** run Prisma generation/schema validation, migrations against PostgreSQL, API integration tests, frontend production build and browser end-to-end tests.
5. **Operational readiness:** add structured logs, backup/restore drills, monitoring, secrets management, HTTPS reverse proxy and deployment-specific CORS/Entra configuration.
6. **Production deployment:** choose hosting, configure managed PostgreSQL, domain, TLS, environment secrets and CI/CD.

Do not describe the application as production-ready until these checks and security tasks are complete.


## After Increment 8
1. Add full edit/detail forms for feedback, requirements, releases and action items.
2. Add saved filters, server-side pagination and bulk operations.
3. Add KPI chart visualisations and reporting-period snapshots.
4. Add invitations, notification preferences and secure cookie sessions.
5. Implement Microsoft Graph Outlook/Teams connectors only after OAuth scopes, encrypted token storage and consent UX are configured.
6. Run Prisma validation/generation, API tests and browser E2E once dependencies and PostgreSQL are available.

## Increment 8 follow-on work
- Add a dedicated archived-products management screen so product restore is available without calling the API directly.
- Extend notifications to release decisions, mentions and overdue work; add email delivery preferences after provider configuration.
- Add richer week-over-week digest comparisons from saved snapshots.
- Add bulk operations for action items and release checklists.
- Complete editable detail views for all record types and add server-side pagination.
- Run Prisma generation, migrations, API tests and browser E2E after dependencies and PostgreSQL are available.

## Increment 9 completed in this development batch
- Added the archived-products list endpoint and a dedicated restore-management view.
- Added bulk action-item status updates with unique ID checks, product/organisation scoping and audit logging.
- Added multi-select and bulk status controls to the Action Items Kanban board.

## Remaining after Increment 9
1. Rich edit/detail experiences for feedback, requirements, releases and action items.
2. Server-side pagination and saved filters for large workspaces.
3. Historical KPI visualisations and week-over-week digest comparisons.
4. Secure cookie sessions, refresh/revocation, password recovery, email verification and rate limiting.
5. Microsoft Graph Outlook/Teams ingestion with explicit consent, encrypted token storage and review-before-import.
6. Full Prisma validation, dependency installation, API integration tests, production builds and browser E2E.
7. Operational readiness: structured logs, backup/restore drills, monitoring, HTTPS, secrets management and CI/CD.

## After Increment 10
1. Add editable metric definitions (name, unit, baseline, target, direction) with safe history semantics.
2. Add server-side pagination, sortable columns and persisted saved filters for high-volume feedback/backlog views.
3. Improve digest comparison with KPI trend series and selectable date windows; add PDF export after report layout is stable.
4. Add notification preferences and explicit in-app deep links to the related product/release/task.
5. Complete secure cookie sessions and recovery flows before external production access.
6. Install dependencies and run full Prisma validation, database migrations, API integration tests, frontend build and browser E2E in a network-enabled Docker environment.


## After Increment 12
1. Add native Decision, Risk, Dependency and Open Question entities and promote approved candidates from the document register without losing source traceability.
2. Integrate OCR for scanned PDFs and add robust legacy `.xls` / `.doc` extraction; preserve page, sheet, row and paragraph coordinates where available.
3. Improve spreadsheet header detection and column mapping, with row-level preview, configurable field mapping and duplicate checks against existing workspace records.
4. Add AI-assisted classification/extraction behind a provider abstraction, with deterministic fallback, explicit confidence calibration and reviewer feedback capture.
5. Extend Project Studio with initiative dependencies, project risks, roadmap timeline and activity feed.
6. Add development planning, sprint/task grouping, test cases, defects and UAT sign-off.
7. Add deployment environments, deployment records, rollback plans, post-release monitoring and portfolio-level reporting.
8. Validate all Prisma relations and establish a migration baseline before production; run complete API/frontend type-checks, Jest, PostgreSQL integration tests, Docker builds and browser E2E.
