# Product OS authentication

Product OS supports two bearer-token authentication paths:

1. **Local accounts** — `POST /api/auth/register` and `POST /api/auth/login` issue Product OS HS256 access tokens. Passwords are stored as salted scrypt hashes. Tokens expire after one hour.
2. **Microsoft Entra ID** — configure a single-tenant Entra application for the API. The browser/client obtains an access token for this API using MSAL and sends it as `Authorization: Bearer <access-token>`. The API validates the Entra signature against cached tenant JWKS, then checks tenant, issuer, audience, key ID, expiry and time-based token claims. Signing keys are cached for one hour, refreshed when an unknown key ID is encountered, and fetched with a five-second timeout. User identity is mapped using the immutable Entra `oid` claim.

Both paths resolve to the same Product OS `User` and organisation-membership model. An email address is not sufficient for API access: the user must have a `Membership` row for the organisation selected by `x-organisation-id`. The organisation guard checks that membership on every protected request.

## Local account endpoints

- `POST /api/auth/register` body: `{ "email": "person@example.com", "password": "at-least-12-characters", "name": "Person" }`
- `POST /api/auth/login` body: `{ "email": "person@example.com", "password": "..." }`

Response contains `accessToken`, `tokenType` and `expiresIn`. Registration creates an account only; it does not grant organisation membership.

## Microsoft Entra setup

1. Create an app registration in the intended Microsoft Entra tenant.
2. Configure the API's Application ID URI and an exposed delegated scope such as `access_as_user`.
3. Configure the client application to request that API scope using MSAL Authorization Code Flow with PKCE.
4. Set `ENTRA_TENANT_ID` to the tenant GUID and `ENTRA_CLIENT_ID` to the API app registration's application/client ID (the expected `aud` claim).
5. Ensure the access token is v2 and carries `oid`, `tid`, `preferred_username` (or `email`), `name`, and the expected audience.
6. Send the access token to Product OS as a bearer token. Do not send an ID token to the API.

## Security notes / production work still required

- Use HTTPS, a secret manager, and a strong unique `JWT_SECRET`; never commit `.env`.
- Entra is deliberately single-tenant. Multi-tenant sign-in requires an explicit tenant allow-list and additional issuer checks.
- Local registration is currently open and must be protected by invitation/approval or disabled for production. Public authentication endpoints now have per-process IP-based request limits (login: 10 per 15 minutes; registration: 5 per hour; Microsoft login/link: 10 per 15 minutes). This is a basic abuse barrier for a single API process, not distributed protection. Production still requires gateway/WAF rate limits, abuse detection, email verification, password reset, refresh-token rotation/revocation and session/device management.
- Configure CORS to the known frontend origin(s), CSRF protections for cookie-based clients, structured security logging and monitoring.
- Add integration tests for invalid/expired tokens, tenant/audience mismatch, membership isolation, account linking, and role permissions.
- Entra JWKS are cached for one hour with unknown-key refresh and a five-second network timeout. Monitor key-fetch failures and retain gateway-level resilience controls.
- A valid identity without an organisation membership is still denied access to product data.


### Explicit account linking
Microsoft sign-in does not silently attach an Entra identity to an existing local account based only on matching email. The user must first authenticate locally and call `POST /api/auth/link/microsoft` with a Microsoft Entra access token whose verified email matches the local account. This reduces account-takeover risk from implicit email linking.

## Browser sign-in and account linking (Increment 7)

The Next.js UI includes an optional MSAL popup when `NEXT_PUBLIC_ENTRA_CLIENT_ID` is configured. It requests `NEXT_PUBLIC_ENTRA_API_SCOPE` and sends the resulting API access token to Product OS:

- `POST /api/auth/link/microsoft` — requires an existing Product OS bearer token and links the verified Entra `oid`/`tid` to the signed-in account. The verified email must match the local account email.
- `POST /api/auth/login/microsoft` — accepts the Entra API access token and issues a short-lived Product OS access token only when the immutable Entra object ID and tenant are already linked to a local user.

The frontend then uses the Product OS token for normal organisation-scoped API calls. The browser MSAL settings are build-time `NEXT_PUBLIC_*` variables; rebuild the web app after changing them. See `LEGACY_IMPORT.md` for the exact environment variable list and scope format.
