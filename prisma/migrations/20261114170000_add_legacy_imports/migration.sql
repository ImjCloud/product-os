CREATE TABLE "LegacyImport" (
  "id" TEXT NOT NULL,
  "organisationId" TEXT NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "counts" JSONB NOT NULL,
  "warnings" JSONB NOT NULL,
  "sourcePayload" JSONB NOT NULL,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LegacyImport_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LegacyImport_organisationId_fingerprint_key" ON "LegacyImport"("organisationId", "fingerprint");
CREATE INDEX "LegacyImport_organisationId_createdAt_idx" ON "LegacyImport"("organisationId", "createdAt");
ALTER TABLE "LegacyImport" ADD CONSTRAINT "LegacyImport_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
