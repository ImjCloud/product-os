# Increment 26 — My Work and Reporting Studio

## What changed

Increment 26 adds two focused workspace experiences using the records already stored in Product OS. It does not add database tables or migrations.

### My Work
- Combines open action items assigned to the signed-in user, approval requests assigned to that user, and unread notifications into one personal queue.
- Shows overdue counts and clear due-date context.
- Provides direct navigation to the existing Action items, Approvals and Notifications areas.
- Uses organisation membership from the authenticated request and filters every query by the active organisation and product. Notifications are additionally filtered to the signed-in user.
- Does not change records, reassign work or make approval decisions.

### Reporting Studio
- Provides four ready-made reports: Delivery Status, Requirements Status, RAID and Decisions, and UAT and Test Readiness.
- Uses existing initiative, action, requirement, release, deployment, metric, risk, issue, dependency, decision, UAT cycle, test case and test execution records.
- Supports an optional initiative focus where records have a direct initiative relationship. The Delivery report explicitly identifies release, deployment and KPI sections as product-level because those records are not directly linked to an initiative in the current data model.
- Exports the generated report as CSV and supports browser Print / Save as PDF.
- Reports are read-only snapshots generated at request time; no duplicate report data is stored.

## API
- `GET /products/:productId/my-work`
- `GET /products/:productId/reports/DELIVERY`
- `GET /products/:productId/reports/REQUIREMENTS`
- `GET /products/:productId/reports/RAID`
- `GET /products/:productId/reports/UAT`
- All endpoints require authentication and verified organisation membership.

## Data and migration impact
- No Prisma schema changes.
- No database migration required.
- No existing record types were merged or replaced.

## Verification status
- TypeScript/TSX syntax transpilation passed for all changed application files.
- Full dependency-backed type-check, Prisma validation/client generation, API integration tests, production builds and browser verification have not been run in this environment. Treat runtime validation as pending.
