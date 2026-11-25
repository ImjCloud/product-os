# Product OS 2.0 — Release Readiness Checklist

Status at Increment 39 (0.39.0): **not yet production-ready**. Source-level checks pass; dependency-backed and environment-backed checks are pending.

## Completed in this checkpoint

- [x] Source TypeScript/TSX syntax transpilation (91 files)
- [x] All-project JSON parsing, package-version alignment and migration-file presence checks
- [x] Root package / lockfile / web package version alignment
- [x] API Docker build switched to `npm ci`
- [x] Repeatable Windows verification runner added
- [x] No database migration introduced by Increments 38–39
- [x] Authentication endpoint rate limiting added (single-process scope)
- [x] Microsoft Entra signing-key cache and rotation refresh added
- [x] Focused authentication rate-limiter unit tests added
- [x] Entra tenant identity checked during bearer identity resolution

## Required before release

- [ ] Install API and web dependencies successfully
- [ ] Prisma schema validation and Prisma Client generation
- [ ] API semantic typecheck
- [ ] API unit tests
- [ ] API production build
- [ ] Web production build
- [ ] Docker Compose configuration validation and clean image builds
- [ ] Clean-database migration rehearsal
- [ ] Upgrade rehearsal against a restored copy of the target database
- [ ] Automated organisation/tenant isolation and role-permission tests
- [ ] Private personal tracker ownership and selective-share tests
- [ ] Browser end-to-end tests for registration/login, workspace setup, core delivery flow, and personal tracking
- [ ] HttpOnly cookie sessions, CSRF protection, password recovery, email verification, refresh-token rotation and distributed rate limiting
- [ ] HTTPS, production CORS, managed secrets, logging, monitoring and alerting
- [ ] Backup and restore drill
- [ ] User acceptance review with a first-time BA and an experienced delivery user

## Run the automated local checks on Windows

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\verify-release.ps1
```

After successful dependency installation, repeat without reinstalling:

```powershell
.\verify-release.ps1 -SkipInstall
```

The script intentionally does not apply database migrations or deploy. Database rehearsals must use disposable/test databases and a restored backup, never an unprotected production database.

## Known verification limitation

The current authoring environment cannot complete dependency installation: an offline install confirmed required packages are not cached. Do not interpret the passing syntax check as a successful TypeScript typecheck or production build. No database or deployment has been changed by this checkpoint.
