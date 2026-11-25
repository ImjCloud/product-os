# Import from the original Product OS HTML app

Product OS 2.0 includes a non-destructive import workflow for the original single-file app. It reads the `product-os-v1` localStorage state (`proj`, `fb`, `req`, `rel`, and `met`).

## 1. Export the original browser data

Open the original Product OS HTML file in the same browser profile where you used it. Open Developer Tools → Console and run:

```js
const data = localStorage.getItem('product-os-v1');
if (!data) throw new Error('No Product OS legacy data found in this browser profile.');
const blob = new Blob([data], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'product-os-v1-export.json';
a.click();
URL.revokeObjectURL(url);
```

Keep the downloaded file in a safe location. It contains your workspace data.

## 2. Import into Product OS 2.0

1. Sign in and select the organisation that should own the imported workspace.
2. Open **Migration** in the left navigation.
3. Select `product-os-v1-export.json` (or paste its JSON contents).
4. Select **Preview import** and review the record counts and warnings.
5. Select **Confirm and import** only after reviewing the preview.

The import adds records; it never deletes or replaces existing workspace data. Exact repeat imports are rejected using an organisation-scoped SHA-256 fingerprint. If you make changes to the old workspace and export again, the new export has a different fingerprint and can be imported as another batch. Review the target organisation first to avoid intentionally importing overlapping versions of the same records.

## 3. Mapping behaviour

| Legacy collection | Product OS 2.0 destination | Notes |
|---|---|---|
| `proj` | Products | Legacy projects are mapped to organisation products by name. |
| `fb` | Action Items | Original action-point status, severity, owner, due date and requirement link are mapped. Source/segment/theme/sentiment/link/reference are retained in the description and full source payload. |
| `req` | Requirements | RICE inputs, status, owner, user story, acceptance criteria and release link are mapped. |
| `rel` | Releases | Version, target date, checklist and decision log are mapped. A legacy Ready release with incomplete checklist is imported as Planning. |
| `met` | Metrics | Baseline, target, actual, review date and release link are mapped. Direction defaults to higher-is-better because the legacy model did not store metric direction. |

Broken relationship references are reported in preview and left unassigned. Invalid dates are imported as empty dates. Missing project references are assigned to the first available project. The original JSON is retained in the import record for audit/recovery; it is not exposed through the regular workspace UI.

## 4. Microsoft Entra sign-in

Optional browser sign-in uses MSAL. Configure a single-tenant app registration with a SPA redirect URI matching `NEXT_PUBLIC_ENTRA_REDIRECT_URI`. Expose an API scope named `access_as_user`; configure the API audience/client ID consistently with `ENTRA_CLIENT_ID`. Set:

- `ENTRA_TENANT_ID` and `ENTRA_CLIENT_ID` for API token validation.
- `NEXT_PUBLIC_ENTRA_CLIENT_ID` and `NEXT_PUBLIC_ENTRA_TENANT_ID` for the browser app.
- `NEXT_PUBLIC_ENTRA_API_SCOPE` to the full exposed scope, normally `api://<API-APP-CLIENT-ID>/access_as_user`.
- `NEXT_PUBLIC_ENTRA_REDIRECT_URI` to the registered SPA redirect URI.

Build the web container again after changing `NEXT_PUBLIC_*` values because Next.js embeds them at build time. A user must first sign in with their Product OS account and link the matching Microsoft identity. After linking, Microsoft sign-in is available. The API verifies the Microsoft JWT signature and configured issuer, tenant and audience before accepting the identity.

## Current integration boundary

This increment completes Entra browser sign-in/linking. It does **not** yet ingest Outlook mail or Teams messages. Graph ingestion needs separate delegated Graph permissions, consent, source selection, duplicate handling and a review-before-import flow; do not treat the sign-in scope as permission to read mail or chats.
