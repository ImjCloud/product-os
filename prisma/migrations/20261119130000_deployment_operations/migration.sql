CREATE TYPE "DeploymentStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'SUCCEEDED', 'FAILED', 'ROLLED_BACK');

CREATE TABLE "Deployment" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "releaseId" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "status" "DeploymentStatus" NOT NULL DEFAULT 'PLANNED',
    "versionLabel" TEXT NOT NULL DEFAULT '',
    "plannedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "deployedBy" TEXT NOT NULL DEFAULT '',
    "rollbackPlan" TEXT NOT NULL DEFAULT '',
    "verificationNotes" TEXT NOT NULL DEFAULT '',
    "failureReason" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Deployment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Deployment_organisationId_productId_status_idx" ON "Deployment"("organisationId", "productId", "status");
CREATE INDEX "Deployment_releaseId_createdAt_idx" ON "Deployment"("releaseId", "createdAt");
ALTER TABLE "Deployment" ADD CONSTRAINT "Deployment_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Deployment" ADD CONSTRAINT "Deployment_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Deployment" ADD CONSTRAINT "Deployment_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "Release"("id") ON DELETE CASCADE ON UPDATE CASCADE;
