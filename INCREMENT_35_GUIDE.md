# Increment 35 — Actionable Organisation Portfolio Attention

## What changed
- Extended the organisation portfolio overview API with a bounded attention list across overdue action items, open risks, open issues, pending decisions, unresolved dependencies and pending change requests.
- Each attention item includes its product identity and record identity, allowing the portfolio page to open the correct product and relevant work area.
- Added a `Needs attention` section to the portfolio page. Selecting an item opens its product's Action items board or the relevant Analysis register.
- Analysis register navigation selects the relevant register and scrolls the matching record into view. Action item navigation scrolls the matching task card into view.
- Preserved organisation membership checks and organisation/product scoping. Archived products remain excluded.
- No database migration or schema change.

## Limits
- The attention list is capped at 40 items per organisation overview request (with bounded per-register queries). It is an operational shortlist, not a complete replacement for each register.
- It does not calculate delivery health, performance trends, or an inferred risk score.
- Build, database integration and browser verification must be completed in the user's development environment; dependencies are not installed in this source workspace.

## Upgrade
Replace the source with this increment's package. No database migration is required.
