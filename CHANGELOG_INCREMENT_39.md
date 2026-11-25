# Increment 39 — Authentication Hardening

- Added process-local IP request limits for public authentication endpoints.
- Added rate-limit headers and clear retry guidance on rejected attempts.
- Added cached Microsoft Entra signing keys, concurrent fetch coalescing, key-rotation refresh and a bounded network timeout.
- Added JWT not-before and future-issued-at checks.
- Added focused rate-limiter tests and updated security documentation.
- No database migration.
