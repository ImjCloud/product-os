# Product OS 2.0 — Increment 18: Change Impact Centre

## Included
- Adds `GET /api/products/:productId/analysis/change-impact`.
- Returns change requests for the selected organisation and product, with their linked initiative where present.
- For each linked initiative, counts related requirements, action items, decisions, risks, dependencies, stakeholders, issues, process analyses, test cases and benefit measures.
- Adds a Change impact workspace view with request selection, affected-record counts, recorded impact statements and manual-review guidance.
- Does not add a database migration. It uses the existing ChangeRequest and initiative relationships.

## Important interpretation
This is an **initiative-level impact discovery aid**, not a deterministic change-impact engine. It counts records associated with the same initiative; it cannot prove that every counted record is affected by the particular change request. Review each candidate with its owner, and update the change request's scope, schedule, cost and risk assessment before making an approval decision. Requests without an initiative link, or initiatives with no linked records, are flagged for manual review.

## API and security
- Route is protected by `OrganisationGuard`.
- Product is verified against the authenticated organisation.
- All queries are constrained by organisation and product IDs.
- Read-only endpoint; no writes or schema changes.

## Integration
1. Back up the application folder and database.
2. Merge this increment into the matching Increment 17 source tree; do not overwrite a different baseline.
3. Install dependencies using the lockfile.
4. Run Prisma generate, API typecheck/tests/build, and frontend build.
5. Start API and web app; select a product and open **Change impact**.
6. Verify with change requests both with and without initiative links.

## Validation performed in packaging environment
- TypeScript transpile syntax checks passed for the changed controller and two changed React components.
- Package JSON files parse successfully.
- Full TypeScript typecheck, Prisma generation, integration tests, database tests and browser tests were not run because dependencies are not installed in this environment.
