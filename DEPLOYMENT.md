# Local development and deployment

## Prerequisites
- Node.js 22+
- npm 10+
- PostgreSQL 16+ (or Docker Desktop)
- A 32+ character random `JWT_SECRET`

## Local setup
1. Copy `.env.example` to `.env` and set `DATABASE_URL`, `JWT_SECRET`, and browser `CORS_ORIGINS`.
2. Start PostgreSQL.
3. Install packages: `npm install`.
4. Generate Prisma client: `npm run prisma:generate`.
5. For the local MVP database, synchronise the schema with `npx prisma db push`. This archive does not yet contain a complete checked-in migration baseline.
6. Start the API: `npm run start:dev`.
7. Check `GET http://localhost:3000/api/health` and `GET http://localhost:3000/api/health/ready`.

The repository includes a Prisma migration history, including an initial migration and subsequent additive migrations. However, that history has not yet been validated against a clean PostgreSQL database or an existing installation in this environment. Before production, install dependencies, run `prisma validate` and `prisma generate`, then test `prisma migrate deploy` against both a clean database and a restored copy of the intended upgrade database. Use `db push` only for disposable local development databases; never use it as the production migration strategy.

## Docker Compose
1. Copy `.env.example` to `.env`.
2. Set a strong `JWT_SECRET` and `POSTGRES_PASSWORD` in `.env`.
3. Run `docker compose up --build`.

The compose file starts PostgreSQL, the API and the Next.js web application. For a disposable local MVP database only, the Windows `start-product-os.ps1` script currently performs a Prisma schema sync. Before using migration-based deployment, back up the database and validate the checked-in migration history; do not point the development schema-sync script at production data.

## Microsoft Entra configuration
Create an Entra app registration for the API, expose an API scope, and configure the tenant and API audience in `ENTRA_TENANT_ID` and `ENTRA_CLIENT_ID`. The browser client uses MSAL. Set `NEXT_PUBLIC_ENTRA_CLIENT_ID`, `NEXT_PUBLIC_ENTRA_TENANT_ID`, `NEXT_PUBLIC_ENTRA_API_SCOPE` and `NEXT_PUBLIC_ENTRA_REDIRECT_URI`; the API uses `ENTRA_TENANT_ID` and `ENTRA_CLIENT_ID`. The browser must request an access token for the API audience; an ID token or Microsoft Graph token is not accepted by the API. Rebuild the web image after changing public Entra values. Users first sign in locally and link the matching Microsoft identity, then can use Microsoft sign-in. See `LEGACY_IMPORT.md` for detailed setup.

## Production checklist
- Validate the checked-in initial Prisma migration and subsequent migrations against a clean PostgreSQL database, then use `prisma migrate deploy`.
- Configure HTTPS and a trusted reverse proxy.
- Set exact production CORS origins.
- Enforce distributed rate limiting and abuse detection at the gateway/WAF; the application-level limiter is per-process only.
- Add password reset and email verification.
- Monitor Entra token/JWKS cache refresh failures and authentication abuse.
- Configure backups, restore drills, log retention and alerting.
- Run unit, API integration, tenant-isolation and role-permission tests against PostgreSQL.
- Review privacy, retention, consent and security requirements before onboarding real customer data.

## Migration order
A complete migration chain is not included in the current source archive. Build and validate a clean-database baseline plus incremental migrations before production deployment.

## Web application deployment
The Next.js application lives in `apps/web` and is included as the `web` service in Docker Compose. It listens on port 3001 and calls the API URL supplied at build time through `NEXT_PUBLIC_API_URL` (default `http://localhost:3000/api`). Set `CORS_ORIGINS` to the browser-visible origin of the web app. For production, use HTTPS and set `NEXT_PUBLIC_API_URL` to the public API origin before building the web image.

The current UI stores the short-lived bearer token in `sessionStorage`. Do not treat this as a final production authentication architecture. Implement an HttpOnly, Secure, SameSite cookie session with CSRF protection before production use.
