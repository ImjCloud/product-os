# Increment 40 — Runtime Configuration & Abuse-Resistance Hardening

## Changes
- API startup now validates required configuration before opening the listener.
- JWT secrets must be unique, non-placeholder values with at least 32 characters.
- `DATABASE_URL` is required.
- CORS must use explicit HTTP(S) origins; wildcard origins are rejected.
- Production CORS origins must use HTTPS, except localhost for controlled local deployments.
- Authentication rate-limit storage is bounded to 10,000 entries and prunes expired/old entries under pressure.
- Added tests for configuration acceptance and rejection cases.

## Operator impact
Check `.env.example` and ensure `.env` has a strong `JWT_SECRET`, a working `DATABASE_URL`, and explicit `CORS_ORIGINS` before starting the API. Docker Compose already requires `JWT_SECRET` and supplies a database URL. Do not reuse the example secret.

## Compatibility
No database migration. Existing API and web contracts are unchanged. Startup will now fail early when required environment values are absent or unsafe.

## Verification boundary
Source syntax and archive integrity checks are not substitutes for dependency-backed Jest/typecheck/build/Prisma/database/browser tests. Those remain required before first local testing handover.
