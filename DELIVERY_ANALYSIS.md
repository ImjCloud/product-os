# Increment 15 — Delivery Analysis, Testing & Benefits

## Added capability
- Process analysis records with purpose, scope, as-is, to-be, gap analysis, assumptions, owner, status and optional initiative link.
- Test cases with stable product-level keys, objective, preconditions, ordered steps, expected result, optional requirement/initiative links and lifecycle status.
- Test executions with outcome, actual result, evidence URL, defect reference, executor, execution timestamp and notes.
- Benefit measures with unit, baseline, target, actual, measurement method, dates, owner and realisation status.
- Product workspace Delivery analysis tab with register views, create/edit forms and test execution capture.

## API
- `GET/POST /products/:productId/delivery-analysis/process-analyses`
- `PATCH /products/:productId/delivery-analysis/process-analyses/:id`
- `GET/POST /products/:productId/delivery-analysis/test-cases`
- `PATCH /products/:productId/delivery-analysis/test-cases/:id`
- `POST /products/:productId/delivery-analysis/test-cases/:id/executions`
- `GET/POST /products/:productId/delivery-analysis/benefits`
- `PATCH /products/:productId/delivery-analysis/benefits/:id`

All endpoints use organisation membership verification, product scoping, write-role checks and audit events. Linked initiatives and requirements are checked against the same product and organisation.

## Migration
`prisma/migrations/20261119090000_delivery_analysis/migration.sql`

Apply only after taking a database backup and validating the current migration history. Do not use `prisma db push` as a substitute for resolving a migration mismatch.

## Known limitations
- Process analysis currently captures structured text, not a graphical BPMN editor.
- Test execution is manual; automated test-runner integrations are not included.
- Evidence is currently a URL/reference, not an uploaded evidence repository.
- Benefit tracking stores current baseline/target/actual values; longitudinal measurement history and benefit dashboards remain future work.
- Release gates and automated sign-off rules are not yet enforced by this increment.

## Increment 16 — Traceability and Assurance read models

Two read-only product-scoped endpoints extend the delivery analysis workspace without introducing duplicate records:

- `GET /products/:productId/delivery-analysis/traceability` returns requirement-centred links to source feedback, action items, initiative, release and test cases, plus unlinked-record counts for key BA registers. This is a navigation/coverage view, not a forced-linking workflow.
- `GET /products/:productId/delivery-analysis/assurance` returns a consolidated delivery assurance snapshot: requirement test coverage, latest test outcomes, release checklist completion, open risks/issues/dependencies, pending change reviews, benefits tracking and process analyses awaiting approval.

Both endpoints are read-only, protected by the existing organisation membership guard, and filter every queried record by the authenticated organisation and selected product. They do not mutate the database or require a migration. Counts are derived from current native records; latest test outcome is based on the most recent execution per test case.
