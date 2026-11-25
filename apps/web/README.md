# Product OS Web

Next.js 15 / React 19 workspace UI for the Product OS API.

## Local development

1. Start PostgreSQL and the API from the repository root.
2. Copy `.env.example` to `.env.local`.
3. Set `NEXT_PUBLIC_API_URL=http://localhost:3000/api`.
4. Run `npm install` in `apps/web`.
5. Run `npm run dev` in `apps/web` and open http://localhost:3001.

The API must allow the web origin through `CORS_ORIGINS`.

## Included screens

- Local account registration and sign-in.
- Organisation selection and creation.
- Product selection and creation.
- Product overview with delivery counts and KPI progress.
- Feedback capture, search and status updates.
- Requirement capture, RICE-ranked backlog and status updates.
- Action-item board with status changes and creation.
- Release checklist and lifecycle status changes.
- KPI capture and progress view.
- Organisation member list, role changes and adding existing users.
- Audit activity table.
- Product-level JSON backup export.

## Current limitations

- Microsoft Entra browser sign-in / MSAL redirect is not wired into this UI yet; the backend identity-link endpoint exists.
- Invitations, password recovery, email verification and refresh-token renewal are not implemented.
- JSON export is available; validated restore/import is deliberately not exposed until a server-side transactional import endpoint and conflict policy are added.
- Bearer tokens are held in `sessionStorage` for this MVP. This is more limited than persistent local storage but remains exposed to same-origin script execution. A production release should move to a secure, HttpOnly, SameSite cookie-backed session with CSRF protection.
- No real browser build or end-to-end test has been run in this offline environment.
