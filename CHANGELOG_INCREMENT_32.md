# Increment 32 — Personal Follow-up Scheduling

- Added a distinct nullable `followUpAt` field to personal action points; existing `dueAt` semantics are unchanged.
- Added an additive PostgreSQL migration and follow-up index.
- Added an organisation/product/access-scoped personal follow-up endpoint.
- Added follow-up date fields to personal action create/edit flows.
- Added an upcoming follow-up queue and today / this week / overdue filters.
- Follow-up dates are personal review reminders only; no background scheduler or outbound notifications are introduced.
