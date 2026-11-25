# Increment 21 — Initiative Command View

Version: 0.21.0

## Purpose

Provides a consolidated, read-only view of the records explicitly linked to one initiative. It reduces navigation between registers while preserving each record's native type and lifecycle.

## What changed

- Added `GET /products/:productId/delivery-analysis/initiative-command/:initiativeId`.
- Added the Initiative Command tab and `InitiativeCommandPanel` frontend component.
- Displays linked requirements, actions, decisions, risks, dependencies, stakeholders and latest engagement follow-ups, issues, change requests, process analyses, test cases/latest executions, and benefit measures/recent measurements.
- Shows milestone checkpoints, action/decision/risk/issue/dependency/change counts, and latest test outcome distribution.
- Explicitly excludes unlinked records rather than guessing associations.
- No schema change or database migration is required.

## Access and data boundaries

The endpoint validates the product against the authenticated organisation and validates the initiative against that same organisation and product. All record queries include organisation and product scope. This endpoint is read-only. Existing write permissions and audit flows are unchanged.

## Important interpretation

The command view is a consolidated view, not a project health verdict. Counts describe linked records. Risk exposure is not reduced to a fabricated score. Test distribution uses the latest execution per test case. Benefit history shows recent recorded measurements, not an inferred trend forecast. Releases are not included as a direct initiative record because the current release model is connected through requirement/action release links rather than an initiative foreign key.

## Validation

Syntax/transpile checks and package JSON checks were performed. Full dependency-backed TypeScript checks, Prisma generated-client checks, API integration tests, and browser tests remain pending. No database migration was applied.
