# Product OS 2.0 — Increment 19: Deployment Operations

## Purpose
Adds a deployment operations layer after release readiness. Release planning/readiness remains in the Releases workspace; deployments represent actual attempts to move a release into a named environment.

## Included
- Deployment records linked to an existing organisation, product and release.
- Environment tracking: DEVELOPMENT, TEST, STAGING and PRODUCTION.
- Lifecycle: PLANNED → IN_PROGRESS → SUCCEEDED or FAILED; a retry is recorded as a new deployment attempt; SUCCEEDED may be marked ROLLED_BACK.
- Planned/start/completion timestamps, owner, rollback plan, verification notes and failure reason.
- Audit events for creation and every update/status transition.
- New Deployment operations workspace panel, filtered to the active product.

## API
- `GET /api/products/:productId/deployments`
- `POST /api/releases/:releaseId/deployments`
- `PATCH /api/deployments/:deploymentId`

A release must be READY before a deployment can be planned. Success requires post-deployment verification notes. Failure requires a reason. Rollback requires a recorded rollback plan. Transitions outside the allowed lifecycle are rejected.

## Data and security
- Additive `Deployment` table and `DeploymentStatus` enum.
- All operations are organisation-scoped; deployment creation inherits product and release identity from the verified release rather than trusting client-supplied IDs.
- Writes use the existing role guard and audit log.
- No external CI/CD integrations or deployment execution are performed. This is an operational record and control surface, not a remote deployment agent.

## Migration
`prisma/migrations/20261119130000_deployment_operations/migration.sql`

## Validation status
Syntax and static structure checks are performed during packaging. Prisma generation/schema validation, database migration, full API/frontend typechecks, integration tests and browser tests must be completed in the user's environment before production use.
