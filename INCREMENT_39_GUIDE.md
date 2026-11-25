# Increment 39 — Authentication Hardening

**Version:** 0.39.0  
**Database migration:** None

## Included

- Per-process IP-based request limits on public registration, password login, Microsoft login and Microsoft account-link endpoints.
- Rate-limit response headers and `Retry-After` on HTTP 429 responses.
- Microsoft Entra JWKS caching for one hour, coalesced concurrent fetches, a forced refresh when an unfamiliar key ID is encountered, and a five-second network timeout.
- Additional JWT `nbf` and future-`iat` checks.
- Focused unit tests for the authentication limiter.

## Limits to understand

The request limiter stores counters in application memory. It reduces accidental and basic repeated attempts on a single API process, but counters are not shared between replicas and reset when the process restarts. Production must also apply distributed limits at the ingress gateway/WAF and monitor abuse patterns.

This increment does not add password reset, email verification, refresh-token rotation, account lockout, or HttpOnly cookie sessions. The web client still uses session-scoped bearer-token storage and is not production-grade session management.

## Verification

Source syntax and JSON checks are run by `npm run verify:source`. The Jest test is included but must be run after installing dependencies with `npm test -- --runInBand src/auth/auth-rate-limit.spec.ts`. Full typechecking, Prisma checks, builds, database rehearsals and browser tests remain release work; this increment does not claim those passed.
