# Product OS 2.0 — Increment 24: Approval Workflow

Version: 0.24.0

## Purpose
Introduce accountable, auditable approval requests for important product and delivery records without silently changing the state of the underlying record.

## Capabilities
- Submit an approval request against an initiative, requirement, change request, release, deployment, UAT cycle, evidence item, decision or risk.
- Assign an approver who is an active member of the same organisation.
- Prevent self-approval.
- Require a written rationale when requesting approval.
- Permit only the assigned approver to approve or reject a pending request.
- Require a written decision note for approval or rejection.
- Permit only the requester to withdraw a pending request.
- Record request submission, decision and withdrawal in the audit log.
- View all, pending, assigned and personally requested approvals in the new Approvals workspace.

## API
- `GET /products/:productId/approvals?scope=assigned|requested`
- `POST /products/:productId/approvals`
- `PATCH /products/:productId/approvals/:id/decision`
- `PATCH /products/:productId/approvals/:id/withdraw`

## Data and security
- ApprovalRequest is organisation- and product-scoped.
- The target record must exist in the same organisation and product.
- Approvers must be organisation members.
- Approval decisions are restricted to the assigned approver's authenticated user ID.
- Request withdrawal is restricted to the requester.
- All writes are audit logged.
- Deleting a user preserves the approval record and clears the optional user relation.

## Deliberate limitations
- This increment records decisions; it does not automatically alter the target record's status.
- Sequential, parallel and quorum approval chains are not yet implemented.
- Email, push and in-app notifications are not yet triggered by approval events.
- Delegation, proxy approval and SLA escalation are not yet implemented.
- Approval target relationships are validated at request creation; they are not enforced as foreign keys because supported targets span multiple record tables.

## Initiative workflow gates
Two optional transition rules are now supported on initiative workflow stages:
- `requireNoPendingApprovals`: blocks the stage transition while initiative-level approval requests remain pending.
- `requireApprovedInitiativeApproval`: requires at least one approved initiative-level approval request before transition.

These checks apply only when the stage's `transitionRules` explicitly enables them. Existing workflow configurations are unchanged.
