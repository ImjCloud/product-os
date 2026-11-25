# Increment 38 — Verification and Release Tooling

- Added repeatable dependency-light source integrity verification.
- Added a Windows PowerShell release verification runner covering Prisma, typecheck, tests, API/web production builds and optional Docker Compose validation.
- Added the `verify:source` package script.
- Switched the API Docker build from unconstrained `npm install` to lockfile-driven `npm ci`.
- Updated API and web package versions to 0.38.0 and aligned the root lockfile version.
- No database migration or application feature changes.
