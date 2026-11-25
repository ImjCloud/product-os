# Increment 30 — Meeting-to-Action Capture & Weekly Personal Review

## Purpose
Make it faster for a BA to turn their own meeting notes into personal follow-up actions, then review what moved during the week without involving other people.

## What's included
- Paste meeting notes into a personal tracker and prepare action drafts from bullet, numbered, checkbox or plain-text lines.
- Review, edit or remove each draft before saving.
- Create up to 50 personal action points in one request.
- Bulk creation is transactional: either the full batch is created or none of it is.
- Added a seven-day personal review showing actions updated, completed and due soon.
- Capture is deterministic line parsing, not AI extraction. It does not infer owners, dates or priorities.

## Privacy and data handling
- Pasted source notes stay in the browser and are not persisted as a meeting transcript.
- Only confirmed draft action titles are sent to the API.
- The API requires edit access to the selected personal tracker and validates every action.
- The resulting records remain personal tracker actions; no shared action register, assignment, approval or notification is created.
- Existing tracker/action sharing permissions continue to apply.

## Data and migration
- Reuses Increment 28 personal tracking models.
- No database migration required.

## Verification
- Personal tracking controller and panel passed TypeScript syntax transpilation.
- Root/web package manifests and lockfile parsed successfully.
- Full TypeScript type-check, Prisma validation, framework builds, API integration tests and browser tests remain pending.
