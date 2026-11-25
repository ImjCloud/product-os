# Product OS 2.0 — Increment 16

## Traceability & Delivery Assurance

This increment builds on the Increment 15 source package. It adds two organisation-scoped, read-only API views and a new frontend workspace tab.

### New workspace

Open **Traceability & assurance** after selecting an organisation and product.

- **Requirement traceability** shows requirements with linked feedback, action items, initiative, release and test cases. It also reports counts of records that do not yet have a primary link. Unlinked records are not automatically treated as errors; link them where it improves understanding and auditability.
- **Delivery assurance** summarises test coverage, latest test outcomes, release checklist completion, open risks/issues/dependencies, change requests awaiting review, benefits tracking and process analyses awaiting approval.

### API endpoints

- `GET /api/products/:productId/delivery-analysis/traceability`
- `GET /api/products/:productId/delivery-analysis/assurance`

Both endpoints require the existing bearer token and `X-Organisation-Id` header. All reads are filtered by the authenticated organisation and selected product.

### Database and migration

No Prisma schema changes or database migration are required. This increment only adds read-only queries and a frontend view. Existing data is not modified.

### Safe integration

1. Back up the project folder and PostgreSQL database.
2. Preserve the current `.env` and local configuration.
3. Merge this source into a copy of the existing installation; do not overwrite the live working folder blindly.
4. Install dependencies using the repository lockfile (`npm ci`).
5. Run Prisma client generation, API type-check/build, frontend build and tests before starting the application.
6. Open the new Traceability & assurance tab and confirm that the selected organisation/product data is displayed correctly.

### Verification status

The package JSON parses and the source changes are present. A full TypeScript check and application build were not completed in the authoring environment because dependency installation did not finish. Validate in the user's local environment before deployment.
