# Product OS 2.0 — Increment 11 upgrade guide

## What is new

- Project Studio with first-class initiatives and outcome statements.
- Initiative owners, start/target dates, delivery status and editable details.
- Initiative milestones with dates and completion status.
- Link requirements and action items to an initiative without duplicating records.
- Promote/link an existing action item to an initiative while retaining its original ID and recording an audit event.
- Product-specific workflow stages, defaulting to Intake → Discovery → Planning → Development → Testing & UAT → Release → Live & Monitoring.
- Initiative stage transitions and transition history.
- Optional gate rules evaluated by the API when a destination stage is marked as a gate.
- KPI definition editing with history snapshots when the definition changes.

## Upgrade the existing Windows installation

1. Make a backup copy of your current `product-os-2-foundation` folder. Do not delete your existing `.env` file or Docker database volume.
2. Stop the running application from the project directory:
   `.\stop-product-os.ps1`
3. Extract this increment archive into the project directory, allowing the source files to be replaced. Keep your existing `.env` file. The archive intentionally contains only the authoritative top-level project; it does not include the older nested duplicate or backup config copies.
4. Start the application:
   `.\start-product-os.ps1`
5. The local startup script rebuilds the API and web images, synchronises the development database schema with `prisma db push`, and starts the services.
6. Open `http://localhost:3001` and select a product. Project Studio is available in the left navigation.

The startup script uses `db push` because this source archive does not contain a complete migration baseline. This is a local MVP development workflow only. Do not use `db push` as a production deployment or migration strategy. Create and validate a full migration baseline before production use.

## Configure workflow gates

Open Project Studio → Configure stages. The editor accepts a JSON array. Each stage needs a unique uppercase `key`, a `name`, optional `description`, `isGate` and `transitionRules` object.

Supported transition rule keys:

- `requireNoBlockedActions`: block entry while linked action items are blocked.
- `requireNoOpenActions`: block entry while linked action items are not completed.
- `requireAllRequirementsScoped`: block entry while linked requirements remain in Discovery.
- `requireAllRequirementsShipped`: block entry until every linked requirement is shipped.
- `requireAllMilestonesCompleted`: block entry until all initiative milestones are complete.

Rules are evaluated only when the destination stage has `isGate: true`. The workflow is deliberately flexible: stages without gate rules do not force these checks. Role-based approvals, transition maps and configurable bypass permissions are future work.

## Verification status

57 TypeScript/TSX files passed syntax transpilation with zero syntax diagnostics. JSON configuration and Docker Compose YAML parse successfully. Full TypeScript type-check, Prisma schema validation/client generation, database sync against your local PostgreSQL volume, Jest, Docker image build and browser end-to-end tests have not been run in this build environment. The local Windows startup script will perform the schema sync after you install this increment.
