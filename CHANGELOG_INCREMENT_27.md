# Increment 27 — Workflow Stage Gate Readiness

- Added a read-only preview of initiative workflow gate readiness.
- Exposes configured stage checks and outstanding blockers before a stage transition is attempted.
- Reuses the same assessment logic for readiness preview and transition enforcement.
- Added gate readiness visibility to Initiative Command.
- No database migration required.
- Runtime/build verification remains pending; see `INCREMENT_27_GUIDE.md`.
