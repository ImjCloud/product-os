CREATE TABLE "EvidenceItem" (
  "id" TEXT NOT NULL,
  "organisationId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "initiativeId" TEXT,
  "title" TEXT NOT NULL,
  "evidenceType" TEXT NOT NULL DEFAULT 'DOCUMENT',
  "targetType" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "sourceUrl" TEXT,
  "referenceCode" TEXT,
  "capturedAt" TIMESTAMP(3),
  "ownerLabel" TEXT,
  "verificationStatus" TEXT NOT NULL DEFAULT 'UNVERIFIED',
  "verificationNotes" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EvidenceItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "EvidenceItem_organisationId_productId_createdAt_idx" ON "EvidenceItem"("organisationId", "productId", "createdAt");
CREATE INDEX "EvidenceItem_productId_targetType_targetId_idx" ON "EvidenceItem"("productId", "targetType", "targetId");
CREATE INDEX "EvidenceItem_initiativeId_verificationStatus_idx" ON "EvidenceItem"("initiativeId", "verificationStatus");
ALTER TABLE "EvidenceItem" ADD CONSTRAINT "EvidenceItem_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EvidenceItem" ADD CONSTRAINT "EvidenceItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EvidenceItem" ADD CONSTRAINT "EvidenceItem_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "Initiative"("id") ON DELETE SET NULL ON UPDATE CASCADE;
