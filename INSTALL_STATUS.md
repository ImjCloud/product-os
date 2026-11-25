# Dependency and verification status

- Runtime available in the development container: Node.js 22 and npm 10.
- Docker CLI is not available in this environment.
- Package manifests include NestJS, Prisma, Next.js, React, Zod, Jest and `@azure/msal-browser`.
- Dependency installation has not completed in this environment because npm registry access previously failed/timed out. There are no checked-in `node_modules` directories or generated Prisma Client artifacts.
- TypeScript/TSX transpile syntax check: 52 files checked, zero syntax diagnostics after Increment 8 changes.
- JSON package/config files parse successfully; Docker Compose YAML parses and contains postgres/api/web services.
- Full TypeScript typecheck, Prisma generate/validate, Jest execution, PostgreSQL migration/integration tests, Next.js production build, Docker build and browser E2E remain unverified.

On a machine with internet access and Docker Desktop, follow `DEPLOYMENT.md`, run `npm install` in the root and `apps/web`, then run `npm run prisma:generate`, `npm run check`, and the Docker Compose startup script. Confirm the migration `20261114170000_add_legacy_imports` applies before importing data.

- Increment 8 Prisma migration and schema changes are authored but Prisma CLI validation/generation could not be run because dependencies are not installed.
- Added action-item comments, KPI value history snapshots, and product editing. These new database-backed flows require runtime verification after installing dependencies and applying migrations.


## Increment 8 validation note (2026-11-14)
- 56 TypeScript/TSX files passed TypeScript transpile syntax checks with zero syntax diagnostics.
- Root/web package JSON and web TypeScript config parse successfully.
- Docker Compose YAML parses successfully.
- New migrations added for notifications/product archive and digest snapshots.
- Full Prisma schema validation, Prisma Client generation, dependency installation, API type-check/build, database migration execution and browser tests remain unverified because npm registry access and Docker/PostgreSQL are unavailable in this execution environment.


## Increment 9 verification (2026-11-15)
- Increment 8 archive was extracted successfully as the source baseline; Increment 8 archive remains unchanged.
- TypeScript/TSX transpile syntax check: 55 files, zero syntax diagnostics. This is a syntax check only, not a full typecheck or build.
- Root and web package JSON plus web TypeScript config parse successfully.
- Attempted root npm install --no-audit --no-fund; it timed out while fetching @nestjs/common from npm registry after DNS EAI_AGAIN. No dependencies or lockfile were installed.
- Full typecheck, Prisma validation/generation, Jest, PostgreSQL migrations, Next.js production build, Docker build and browser E2E remain unverified.


## Increment 10 verification (2026-11-16)
- Increment 9 archive was extracted as the source baseline; earlier archives were not modified.
- 55 TypeScript/TSX source files passed syntax transpilation with zero syntax diagnostics.
- Root and web package JSON files parse successfully.
- New frontend record editor, digest comparison and release notification paths are authored but require full type-check/runtime validation.
- Dependency installation, Prisma validation/generation, Jest, PostgreSQL migrations, Next.js production build, Docker build and browser E2E remain unverified in this environment.


## Increment 11 source update (2026-11-16)
- Source foundation: top-level project in the user's `product-os-current.zip`; the older nested duplicate is excluded from the delivery.
- Added Initiative, InitiativeMilestone and WorkflowStage Prisma models; linked Requirement and ActionItem records to Initiatives.
- Added Initiative CRUD, milestone operations, action-item promotion/linking, workflow stage transitions/history and configurable gate-check endpoints.
- Added Mission Control Project Studio, configurable delivery pathway UI, KPI definition editor and expanded backup export.
- 57 TypeScript/TSX source files passed syntax transpilation with zero syntax diagnostics; this is not a full type-check/build.
- Prisma validation/client generation/database migration execution are not verified. The archive contains no baseline migration SQL; for local development use `npx prisma db push` after `npx prisma generate`, and do not treat this as a production migration workflow.


## Increment 12 source update (2026-11-16)
- Added the Document Intelligence API module, built-in document extraction utilities, Prisma import/candidate models and the Document Intelligence Centre frontend tab.
- Supported formats in this increment: `.xlsx`, `.docx`, searchable `.pdf`, `.csv`, `.txt`; max upload 15 MB. `.xls` / `.doc` and OCR remain unsupported and are explicitly reported.
- Original source bytes and extracted text are retained; uploads are staged, deduplicated by SHA-256 within the organisation, reviewed by a human, and only approved supported record types are committed.
- The Prisma schema must be pushed to the local development database before using the new tab: `npx prisma db push` (development MVP only). Back up the database first.
- Syntax, schema validation, dependency generation, type-check, unit/integration tests, Docker build and browser tests have not yet been executed in this environment.
