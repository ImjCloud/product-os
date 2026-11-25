# Product OS 2.0 — merged upgrade v0.40.1

This package consolidates the later v0.40.0 feature line with the v0.17.0 release-candidate privacy and query-index migrations. It preserves the legacy HTML reference file.

## Included
- Later workspace experience: Portfolio Overview, My Work, Personal Tracking, Reporting Studio, analysis registers, delivery analysis and other BA workflows.
- Document Intelligence upload/review workflow for supported spreadsheet and document formats.
- Private-by-default personal tracking with selective sharing.
- Existing v0.17 action-item visibility migration and workspace query indexes.
- dotenv runtime loading and local frontend port 3002.

## Safe upgrade from the tested v0.17 folder
1. Stop the frontend and backend terminals. Do not delete the existing project.
2. Back up the PostgreSQL database before applying migrations:
   `docker exec product-os-postgres pg_dump -U product_os -d product_os -Fc -f /tmp/product-os-before-v0401.dump`
   `docker cp product-os-postgres:/tmp/product-os-before-v0401.dump .\product-os-before-v0401.dump`
3. Extract this ZIP into a NEW folder, for example `C:\Users\jholu\Downloads\product-os-2-v0401`.
4. Copy the existing `.env` from the v0.17 folder into the new project root. Keep the same DATABASE_URL and existing secrets. Ensure `CORS_ORIGINS="http://localhost:3001,http://localhost:3002"`.
5. From the new folder run: `npm install`
6. Install frontend dependencies: `npm --prefix apps/web install`
7. Run: `npx prisma generate`
8. Run: `npx prisma migrate deploy`
9. Run: `npm run check`
10. Run: `npm run web:build`
11. Start backend with `npm run start:dev`; in another terminal run `npm run web:dev`; open `http://localhost:3002`.

## Important
- This package does not contain your `.env`, user accounts, or database data.
- The migration step upgrades the existing database in place. Make the backup first.
- Do not run `prisma migrate reset`, `prisma db push`, or delete the existing database.
- If migration deploy reports a failed migration, stop and share the full output; do not manually edit `_prisma_migrations`.
