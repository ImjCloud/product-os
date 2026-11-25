# Product OS 2.0 — Increment 20

Version: 0.20.0

## Scope

Increment 20 adds two connected capabilities to the product workspace:

1. Stakeholder engagement history — a first-class, append-only record of meetings, workshops, interviews, email, phone and other stakeholder interactions.
2. Product portfolio intelligence — a read-only operational summary across initiatives, actions, risks, issues, dependencies, decisions, changes, releases, deployments, tests, benefits and stakeholders.

## Stakeholder engagement

New model: `StakeholderEngagementLog`.

Each record is linked to one stakeholder, product and organisation, and captures:
- Interaction date and channel
- Purpose and discussion summary
- Outcome or agreement
- Next action and owner
- Optional follow-up date

API routes (under `/api/products/:productId/analysis`):
- `GET /stakeholders/:stakeholderId/engagements`
- `POST /stakeholders/:stakeholderId/engagements`

Writes require the existing write permission check and are recorded in the audit log. Reads and writes validate that the stakeholder belongs to the active product and organisation. Engagement history is append-only in this increment; correction/deletion controls are intentionally not introduced yet.

## Portfolio intelligence

API route:
- `GET /portfolio-intelligence`

The endpoint returns a point-in-time summary with operational counts, initiative summaries, upcoming releases, benefit measures, attention signals and scheduled stakeholder follow-ups. It is product-scoped and organisation-scoped.

Attention signals are transparent rules (overdue actions, high probability/high impact risks, high/critical issues and failed deployments). They are not a machine-generated health score or an automated decision. Users should inspect the underlying records before acting.

## Frontend

New workspace tab: `Stakeholder & portfolio`.
- Stakeholder engagement view: select a stakeholder, inspect interaction history and record a new engagement.
- Portfolio intelligence view: review delivery indicators, attention signals, upcoming releases, initiatives, follow-ups and benefits.

## Migration

Apply migration `20261119150000_stakeholder_engagement_log` using the existing migration deployment process. It creates one additive table, indexes and foreign keys. It does not alter existing records.

## Known limitations

- No email/calendar integration or automatic meeting capture.
- No external stakeholder portal or invitations.
- Engagement records do not yet support attachments or evidence file uploads.
- Portfolio intelligence is scoped to the selected product, not an organisation-wide cross-product portfolio.
- The dashboard is a point-in-time read model; it does not infer a single overall project health rating.
- Full dependency-backed type-check, Prisma validation/client generation, migration execution, API tests and browser tests remain required before production deployment.
