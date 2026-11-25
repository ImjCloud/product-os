# Increment 36 — Beginner-first workspace experience

## Purpose
Make Product OS easier to approach for someone new to Business Analysis without removing the professional capabilities experienced users rely on.

## Changes
- Simplified the default sidebar to show the everyday destinations first: Overview, Portfolio overview, My Work, Projects & milestones, Requests & feedback, Requirements, Tasks and Releases.
- Moved specialist analysis, governance, reporting and administration destinations under an expandable **More tools** section. It automatically expands when one of those destinations is selected, so existing deep links and navigation remain accessible.
- Added plain-language labels for the common project and action destinations while preserving the underlying tab identifiers and routes.
- Added a three-step starting guide on the product Overview: capture a request, describe what is needed, and plan the next steps. Each step opens the existing workflow rather than creating a duplicate feature.
- Moved product configuration and archive controls behind a collapsed Product settings disclosure so they do not compete with everyday work.
- Clarified that a workspace can represent a product, service, internal system or business improvement project, not only a software product.

## Product principles
- No capability or record type was deleted.
- No database migration or API change was introduced.
- The guide is optional; users can start at any step and existing data is unchanged.
- Specialist tools remain available through More tools.
- The UI does not force a prescribed BA process or imply that every project must follow the same sequence.

## Verification
- TypeScript/TSX syntax transpilation: performed for `apps/web/components/Workspace.tsx`.
- JSON parsing: performed for root `package.json`, `package-lock.json` and `apps/web/package.json`.
- Full dependency-backed typecheck, Next.js build, browser interaction and visual regression checks: not performed in this environment.
