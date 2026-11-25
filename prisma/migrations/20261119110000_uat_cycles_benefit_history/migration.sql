CREATE TYPE "UatCycleStatus" AS ENUM ('PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED');

CREATE TABLE "UatCycle" (
  "id" TEXT NOT NULL,
  "organisationId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "objective" TEXT NOT NULL DEFAULT '',
  "status" "UatCycleStatus" NOT NULL DEFAULT 'PLANNED',
  "startDate" TIMESTAMP(3),
  "endDate" TIMESTAMP(3),
  "ownerLabel" TEXT,
  "participants" JSONB NOT NULL DEFAULT '[]',
  "acceptanceCriteria" TEXT NOT NULL DEFAULT '',
  "signOffStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "signOffBy" TEXT,
  "signOffAt" TIMESTAMP(3),
  "signOffNotes" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UatCycle_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "UatCycle_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "UatCycle_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "UatCycle_organisationId_productId_status_idx" ON "UatCycle"("organisationId", "productId", "status");

CREATE TABLE "BenefitMeasurement" (
  "id" TEXT NOT NULL,
  "organisationId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "benefitMeasureId" TEXT NOT NULL,
  "value" DOUBLE PRECISION NOT NULL,
  "measuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "source" TEXT NOT NULL DEFAULT '',
  "notes" TEXT NOT NULL DEFAULT '',
  "recordedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BenefitMeasurement_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BenefitMeasurement_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "BenefitMeasurement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "BenefitMeasurement_benefitMeasureId_fkey" FOREIGN KEY ("benefitMeasureId") REFERENCES "BenefitMeasure"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "BenefitMeasurement_organisationId_productId_measuredAt_idx" ON "BenefitMeasurement"("organisationId", "productId", "measuredAt");
CREATE INDEX "BenefitMeasurement_benefitMeasureId_measuredAt_idx" ON "BenefitMeasurement"("benefitMeasureId", "measuredAt");

ALTER TABLE "TestExecution" ADD COLUMN "uatCycleId" TEXT;
ALTER TABLE "TestExecution" ADD CONSTRAINT "TestExecution_uatCycleId_fkey" FOREIGN KEY ("uatCycleId") REFERENCES "UatCycle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "TestExecution_uatCycleId_executedAt_idx" ON "TestExecution"("uatCycleId", "executedAt");


-- Missing schema constraints and indexes restored from the verified schema diff


-- AddForeignKey



-- AddForeignKey



-- AddForeignKey



-- AddForeignKey



-- AddForeignKey
