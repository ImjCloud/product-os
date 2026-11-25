# Product OS 2.0 — Increment 32: Personal Follow-up Scheduling

Version: `0.32.0`

## What this adds

- A separate **Follow-up date** on personal action points. The existing target date still means when the action should be completed; the follow-up date means when you want to revisit progress.
- An upcoming personal follow-up queue with overdue, today and upcoming dates.
- Quick filters for follow-ups due today, this week and overdue.
- Follow-up date editing when creating or updating a personal action.
- A product-scoped API endpoint for the current user's accessible personal follow-ups.
- Follow-up scheduling remains private by default. If you explicitly share a tracker or action, its follow-up date is visible to people with that access. It does not create assignments or send email, push or workspace notifications.

## Upgrade

1. Back up the project folder and PostgreSQL database.
2. Stop Product OS with `./stop-product-os.ps1`.
3. Extract this increment over the existing project directory. Preserve `.env` and the existing Docker database volume.
4. Apply the additive migration with the project's normal migration deployment process:
   `docker compose run --rm api npx prisma migrate deploy`
5. Start the app with `./start-product-os.ps1` and open `http://localhost:3001`.

Migration: `prisma/migrations/20261119210000_personal_followup_scheduling/migration.sql`.

Do not delete or recreate the database volume. If migration deployment fails, stop and retain the error output for diagnosis.

## How to use

1. Open a product and select **Personal Tracking**.
2. Create or edit a personal action point.
3. Set **Target date** for when the work should be completed.
4. Set **Follow-up date** for when you want to check progress again.
5. Use the upcoming follow-up list or the filters to review what needs attention.

The follow-up queue is evaluated when the workspace is loaded or refreshed; this increment does not run a background scheduler or send alerts while the app is closed.

## Verification status

Source syntax and JSON validation are checked in the development environment. Full dependency-backed type-check, Prisma validation/client generation, migration execution against PostgreSQL, API integration tests, Next.js production build and browser tests remain to be run on the local Docker installation. This archive must not be treated as production-build verified.
