# Product OS 2.0 — Increment 17: UAT Operations & Benefits History

## Scope
This increment adds two durable capabilities to the existing BA-to-delivery lifecycle:

- UAT cycles with objectives, dates, owners, participants, acceptance criteria, execution association and formal acceptance decisions.
- Append-only benefit measurements, preserving successive observations while maintaining `BenefitMeasure.actualValue` as the latest snapshot for existing reporting.

## API
- `GET /products/:productId/delivery-analysis/uat-cycles`
- `POST /products/:productId/delivery-analysis/uat-cycles`
- `PATCH /products/:productId/delivery-analysis/uat-cycles/:cycleId`
- `POST /products/:productId/delivery-analysis/uat-cycles/:cycleId/sign-off`
- `GET /products/:productId/delivery-analysis/benefits/:benefitId/measurements`
- `POST /products/:productId/delivery-analysis/benefits/:benefitId/measurements`
- Test execution endpoint accepts optional `uatCycleId` and validates product/organisation ownership.

All write endpoints require the existing write permission guard. Records are organisation/product scoped and audit events are written for cycle changes, sign-off and measurement creation.

## Migration
A new additive migration is included at `prisma/migrations/20261119110000_uat_cycles_benefit_history/`.

Before applying to an existing installation:
1. Back up PostgreSQL using the project's normal backup procedure.
2. Verify the migration history matches the source package.
3. Run `npx prisma validate` and `npx prisma migrate status`.
4. Apply using `npx prisma migrate deploy` only after validation.
5. Regenerate Prisma Client and run API/web checks.

Do not use `prisma db push` as a shortcut on an existing database.

## Important behaviour
- A UAT sign-off decision records ACCEPTED, CONDITIONAL or REJECTED with rationale and actor/time. Conditional/rejected decisions keep the cycle active; accepted decisions complete it.
- The product does not automatically infer acceptance from a passing test percentage. Business acceptance remains an accountable human decision.
- Benefit observations are append-only. Correcting an erroneous observation should be handled through a future correction/void workflow rather than silently overwriting history.
- This increment does not implement external email invitations, e-signatures, evidence file uploads, or a formal regulated validation workflow.

## Validation status
Source-level review and archive checks only. Dependency-backed Prisma validation, generated-client type-check, database migration, API integration tests and browser tests have not been run in this environment.
