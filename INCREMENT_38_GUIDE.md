# Increment 38 — Verification and Release Tooling

**Version:** 0.38.0  
**Database migration:** None  
**Purpose:** make the next local verification pass repeatable and reduce release-build drift.

## Changes

- Added `scripts/verify-source.mjs` to check TypeScript/TSX syntax, JSON parsing and Prisma migration-file presence.
- Added `verify-release.ps1` for Windows PowerShell. It installs locked dependencies, validates/generates Prisma Client, runs API typechecking and unit tests, builds the API and web app, and validates Docker Compose configuration when Docker is available.
- Added `npm run verify:source`.
- Changed the API Docker build to use `npm ci` against the committed root lockfile.
- No application features, database schema or migration files were changed.

## Run on Windows

From the extracted `product-os-2-foundation` directory:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\verify-release.ps1
```

If dependencies are already installed:

```powershell
.\verify-release.ps1 -SkipInstall
```

To skip Docker Compose validation:

```powershell
.\verify-release.ps1 -SkipDockerConfig
```

The script does not apply migrations, alter a database or deploy anything. Run database migration rehearsals separately against disposable clean and restored databases.

## Verification limitation

The current authoring environment could not complete `npm ci` because package downloads timed out. The dependency-backed steps therefore remain unverified here. The dependency-light source verifier completed successfully: 89 TypeScript/TSX files, 2 JSON files under `src` and `apps/web`, and 16 migration directories; no syntax/JSON/missing-migration-file errors. Two migration timestamp prefixes are shared; their directory names sort lexicographically and should be confirmed against a real Prisma migration deployment history.
