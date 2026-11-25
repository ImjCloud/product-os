CREATE TYPE "ProcessAnalysisStatus" AS ENUM ('DRAFT','IN_REVIEW','APPROVED','ARCHIVED');
CREATE TYPE "TestCaseStatus" AS ENUM ('DRAFT','READY','RETIRED');
CREATE TYPE "TestExecutionStatus" AS ENUM ('NOT_RUN','PASSED','FAILED','BLOCKED');
CREATE TYPE "BenefitStatus" AS ENUM ('PLANNED','BASELINED','TRACKING','REALISED','NOT_REALISING','CLOSED');

CREATE TABLE "ProcessAnalysis" (
  "id" TEXT NOT NULL, "organisationId" TEXT NOT NULL, "productId" TEXT NOT NULL, "initiativeId" TEXT,
  "title" TEXT NOT NULL, "purpose" TEXT NOT NULL DEFAULT '', "scope" TEXT NOT NULL DEFAULT '',
  "asIs" TEXT NOT NULL DEFAULT '', "toBe" TEXT NOT NULL DEFAULT '', "gapAnalysis" TEXT NOT NULL DEFAULT '',
  "assumptions" TEXT NOT NULL DEFAULT '', "ownerLabel" TEXT, "status" "ProcessAnalysisStatus" NOT NULL DEFAULT 'DRAFT',
  "version" INTEGER NOT NULL DEFAULT 1, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProcessAnalysis_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProcessAnalysis_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ProcessAnalysis_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ProcessAnalysis_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "Initiative"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "ProcessAnalysis_organisationId_productId_status_idx" ON "ProcessAnalysis"("organisationId","productId","status");
CREATE INDEX "ProcessAnalysis_initiativeId_idx" ON "ProcessAnalysis"("initiativeId");

CREATE TABLE "TestCase" (
  "id" TEXT NOT NULL, "organisationId" TEXT NOT NULL, "productId" TEXT NOT NULL, "initiativeId" TEXT, "requirementId" TEXT,
  "key" TEXT NOT NULL, "title" TEXT NOT NULL, "objective" TEXT NOT NULL DEFAULT '', "preconditions" TEXT NOT NULL DEFAULT '',
  "steps" JSONB NOT NULL DEFAULT '[]', "expectedResult" TEXT NOT NULL DEFAULT '', "status" "TestCaseStatus" NOT NULL DEFAULT 'DRAFT',
  "ownerLabel" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TestCase_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TestCase_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TestCase_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TestCase_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "Initiative"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "TestCase_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "TestCase_productId_key_key" ON "TestCase"("productId","key");
CREATE INDEX "TestCase_organisationId_productId_status_idx" ON "TestCase"("organisationId","productId","status");
CREATE INDEX "TestCase_requirementId_idx" ON "TestCase"("requirementId");

CREATE TABLE "TestExecution" (
  "id" TEXT NOT NULL, "organisationId" TEXT NOT NULL, "productId" TEXT NOT NULL, "testCaseId" TEXT NOT NULL,
  "status" "TestExecutionStatus" NOT NULL DEFAULT 'NOT_RUN', "actualResult" TEXT NOT NULL DEFAULT '', "evidenceUrl" TEXT,
  "defectReference" TEXT, "executedBy" TEXT, "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "notes" TEXT NOT NULL DEFAULT '', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TestExecution_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TestExecution_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TestExecution_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TestExecution_testCaseId_fkey" FOREIGN KEY ("testCaseId") REFERENCES "TestCase"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "TestExecution_organisationId_productId_status_executedAt_idx" ON "TestExecution"("organisationId","productId","status","executedAt");
CREATE INDEX "TestExecution_testCaseId_executedAt_idx" ON "TestExecution"("testCaseId","executedAt");

CREATE TABLE "BenefitMeasure" (
  "id" TEXT NOT NULL, "organisationId" TEXT NOT NULL, "productId" TEXT NOT NULL, "initiativeId" TEXT,
  "title" TEXT NOT NULL, "description" TEXT NOT NULL DEFAULT '', "measurementMethod" TEXT NOT NULL DEFAULT '',
  "unit" TEXT NOT NULL DEFAULT '', "baselineValue" DOUBLE PRECISION, "targetValue" DOUBLE PRECISION, "actualValue" DOUBLE PRECISION,
  "baselineDate" TIMESTAMP(3), "targetDate" TIMESTAMP(3), "lastMeasuredAt" TIMESTAMP(3), "ownerLabel" TEXT,
  "status" "BenefitStatus" NOT NULL DEFAULT 'PLANNED', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BenefitMeasure_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BenefitMeasure_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "BenefitMeasure_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "BenefitMeasure_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "Initiative"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "BenefitMeasure_organisationId_productId_status_idx" ON "BenefitMeasure"("organisationId","productId","status");
CREATE INDEX "BenefitMeasure_initiativeId_idx" ON "BenefitMeasure"("initiativeId");
