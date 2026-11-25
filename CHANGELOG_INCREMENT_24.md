# Increment 24 — Approval Workflow

- Added ApprovalRequest and ApprovalRequestStatus.
- Added additive PostgreSQL migration for approval records and indexes.
- Added product-scoped approval request, decision and withdrawal APIs.
- Added same-organisation approver membership validation and independent approval enforcement.
- Added audit records for submission, decision and withdrawal.
- Added Approvals workspace with request creation, inbox filtering and decision controls.
- Added explicit limitation: approval decisions do not silently mutate target records.
- Extended initiative stage-gate evaluation with optional pending-approval and approved-approval requirements.
- Added an approval target selector API so users choose existing records instead of pasting record IDs.
