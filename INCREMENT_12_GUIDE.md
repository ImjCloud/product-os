# Product OS 2.0 — Increment 12 upgrade guide

## What changed
- New Document Intelligence tab in the workspace.
- Upload/extract XLSX, DOCX, searchable PDF, CSV and TXT (15 MB max).
- Candidate classification: requirement, action item, feedback, decision, risk, dependency and question.
- Human review, editing, confidence adjustment, approval/rejection and explicit commit.
- Approved feedback, requirements and action items are created in the selected product. Other classifications remain in the review register until dedicated modules are implemented.
- Original uploaded file retention with an organisation-scoped source download route.
- SHA-256 exact-file duplicate detection within an organisation and audit events for upload/commit.

## Before upgrading
1. Back up your PostgreSQL database and the whole project folder.
2. Stop Product OS: `./stop-product-os.ps1`.
3. Extract this archive over the existing project directory. Preserve your `.env` file.
4. Start PostgreSQL only if needed, then apply the development schema: `docker compose up -d postgres`; `docker compose run --rm api npx prisma db push`. This uses Prisma schema push for the local MVP only, not production migrations.
5. Start the app: `./start-product-os.ps1`.

If the start script already runs `prisma db push`, you may simply start it after the backup; check the console output for successful schema synchronisation.

## Upload workflow
1. Select the product, then open Document Intelligence.
2. Upload one supported file.
3. Inspect every extracted candidate; correct its classification, title, detail, owner and due date.
4. Approve or reject each candidate.
5. Choose Import approved records.
6. Verify created feedback, requirements and action items in their respective product tabs.

## Important limitations
- `.xls` and `.doc` must be converted to `.xlsx` / `.docx` or CSV/PDF.
- Scanned PDFs need OCR and are not currently OCR processed.
- PDF extraction is best-effort; page/table geometry is not preserved.
- Classifier is heuristic, not an AI service; all candidates need human review.
- Decisions, risks, dependencies and questions are staged and reviewable but are not yet created as native workspace records.
- Max upload size: 15 MB.

## Verification status
The source archive is prepared, but full dependency-backed build, Prisma validation, database tests, Next.js build and browser E2E must be run on the local Docker installation. Do not treat this increment as production-ready until those checks pass.
