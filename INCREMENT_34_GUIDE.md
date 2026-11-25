# Increment 34 — Organisation Portfolio Overview

## What changed
The HOME navigation now includes Portfolio overview. It provides one organisation-wide view of delivery records across active products, including active initiatives, outstanding and overdue actions, open risks and issues, unresolved dependencies, pending decisions and pending change requests.

## How to use
1. Sign in and select an organisation.
2. Open **Portfolio overview** from the HOME navigation.
3. Search for a product or review the portfolio totals.
4. Select **Open** beside a product to enter its existing workspace.
5. Refresh the view after updates to see the latest counts.

## Behaviour and safeguards
- The API verifies organisation membership before returning data.
- Queries are scoped to the selected organisation and its active products.
- Archived products are excluded; their underlying records are not changed.
- This is a current-state operational summary, not an automated health rating or risk prediction.
- No database migration is required.

## Verification
Source-level syntax and JSON checks are required before packaging. Full dependency-backed builds, type checks, API integration tests and browser tests must be run in the target environment before production deployment.
