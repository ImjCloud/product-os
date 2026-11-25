# Increment 31 — Personal Project Activity Timeline

## Purpose
Give an individual BA a reliable chronological view of what has happened across their personal trackers, without requiring a shared project log or involving other workspace members.

## What's included
- Added a personal timeline endpoint scoped to the selected product and the signed-in user's access.
- Timeline includes action creation, progress notes and status changes.
- Supports activity from trackers the user owns, trackers explicitly shared with them, and individual actions explicitly shared with them.
- Added a compact timeline to Personal Tracking, showing the latest 30 events from up to 100 returned events.
- Editing action title, notes, priority or target date now records a progress-history entry; status changes are recorded in the same transaction.
- Timeline events are derived from existing PersonalActionItem and PersonalActionUpdate records.

## Privacy and data handling
- No workspace-wide feed is created.
- The endpoint filters by organisation, product and explicit ownership/share access.
- Individual action shares do not reveal other actions in the owner's private tracker.
- No notification or assignment is created.

## Data and migration
- Reuses existing personal tracking tables.
- No database migration required.

## Verification
- Source syntax and JSON manifest checks should be run before use.
- Full TypeScript type-check, Prisma validation, framework builds, API integration tests and browser tests remain pending unless separately verified.
