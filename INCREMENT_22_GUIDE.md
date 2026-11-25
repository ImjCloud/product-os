# Increment 22 — Evidence Centre & Benefits Intelligence

## Evidence Centre
- Adds an organisation- and product-scoped evidence metadata register.
- Evidence can be linked to supported record types: initiatives, requirements, action items, decisions, risks, dependencies, stakeholders, issues, change requests, process analyses, test cases/executions, releases, deployments and benefit measures.
- The API verifies that the target record belongs to the same organisation and product. Optional initiative links are also validated.
- Evidence metadata includes type, title, description, source URL, reference code, capture date, owner and human verification status/notes.
- Verification status changes are audited.
- This increment does NOT upload files, store file bytes, scan malware, or guarantee that external URLs remain available.

## Benefits Intelligence
- Adds a read-only endpoint that returns baselines, targets, latest actuals and measurement history.
- Calculates progress as (actual - baseline) / (target - baseline) where all three values exist and target differs from baseline.
- Progress is intentionally not clamped, so negative progress and values above 100% remain visible.
- Directionality must be confirmed by the benefit owner: the formula alone cannot know whether a lower value is desirable.
- Includes a frontend summary and per-measure history view.

## API
- `GET /products/:productId/evidence` (optional targetType, targetId, initiativeId filters)
- `GET /products/:productId/evidence/targets?targetType=...` (record picker options)
- `GET /products/:productId/evidence/coverage` (evidence coverage by record category)
- `POST /products/:productId/evidence`
- `PATCH /products/:productId/evidence/:id/verification`
- `GET /products/:productId/delivery-analysis/benefit-intelligence`

## Migration
Apply `prisma/migrations/20261119170000_evidence_centre/migration.sql` after backing up the database.

## Validation status
Syntax and static structure checks only. Full dependency-backed type-check, Prisma validation/client generation, migration execution, API integration and browser testing remain required.
