# Increment 23 — Requirements Quality Assurance

Version: 0.23.0

## Purpose

Help Business Analysts identify incomplete or unclear requirements before they move further into delivery. This is a review aid, not an automated approval gate.

## Included

- `GET /products/:productId/requirements/quality` returns a quality review for up to 500 most recently updated, non-shipped requirements in the selected product.
- Checks for short or unclear titles, missing/short problem statements, missing user-story or equivalent user-need context, missing/short acceptance criteria, subjective acceptance wording, missing owners and missing initiative links.
- Deterministic title-token similarity flags possible duplicate pairs at 72% or greater Jaccard similarity.
- A Requirements Quality workspace shows summary indicators, findings, severity filters and possible duplicates.
- Organisation and product scoping are enforced by the existing product guard and product lookup.

## Interpretation

The score starts at 100 and deducts 25 for each high, 12 for each medium and 5 for each low finding, with a floor of zero. It is a heuristic completeness indicator, not a measure of requirement correctness. A high similarity score is only a prompt to compare intent and context; it is not proof of duplication. Analysts remain responsible for confirming findings and making changes.

## API response

Returns `productId`, `generatedAt`, a `summary`, `requirements` with `qualityScore` and `checks`, and `possibleDuplicates` with both record IDs/titles and a similarity percentage.

## Data and migration

No schema changes or database migration are required. The endpoint is read-only and does not modify requirement records or audit history.

## Verification

Syntax transpilation passed for the changed API controller and frontend panel/workspace. Full TypeScript type-check, dependency-backed Nest/Next builds, API integration tests and browser testing have not been run in this environment.
