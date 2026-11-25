# Increment 27 — Workflow Stage Gate Readiness

## What changed

Product OS now previews configured initiative stage-gate requirements before a user attempts to move an initiative forward.

### Stage gate readiness
- Added `GET /initiatives/:initiativeId/stage-readiness`.
- Returns the initiative's active workflow stages, identifies gate stages, and evaluates configured gate rules against the current initiative records.
- Shows the number of records behind each configured check and whether that check is satisfied.
- Covers the same rules enforced by the stage-transition endpoint: blocked actions, open actions, requirements still in discovery, requirements not shipped, incomplete milestones, pending initiative approvals, and the requirement for at least one approved initiative-level approval.
- The stage-transition endpoint now uses the same assessment logic as the preview, reducing the risk of preview and enforcement rules drifting apart.
- Added the readiness view to Initiative Command so users can see gate conditions without first attempting a transition.

## Important behaviour
- Readiness is a live, read-only preview; it does not change initiative stages or records.
- The server rechecks the configured rules when a transition is submitted.
- Gate checks only run when the workflow stage has the corresponding rule enabled.
- A gate stage with no configured checks is identified as such; it is not represented as having passed substantive checks.
- Queries are scoped to the authenticated organisation and initiative's product. Milestones are scoped through the initiative relation.
- No database schema change or migration is required.

## API
- `GET /initiatives/:initiativeId/stage-readiness`

## Verification status
- TypeScript/TSX syntax transpilation passed for the changed controller and frontend component.
- JSON parsing passed for project JSON files.
- Full dependency-backed type-check, Prisma validation/client generation, API integration tests, production builds and browser verification remain pending.
