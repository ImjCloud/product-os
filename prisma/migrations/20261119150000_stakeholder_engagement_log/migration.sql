CREATE TABLE "StakeholderEngagementLog" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "stakeholderId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "channel" TEXT NOT NULL DEFAULT 'MEETING',
    "purpose" TEXT NOT NULL DEFAULT '',
    "summary" TEXT NOT NULL,
    "outcome" TEXT NOT NULL DEFAULT '',
    "nextAction" TEXT NOT NULL DEFAULT '',
    "ownerLabel" TEXT,
    "followUpAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StakeholderEngagementLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "StakeholderEngagementLog_organisationId_productId_occurredAt_idx" ON "StakeholderEngagementLog"("organisationId", "productId", "occurredAt");
CREATE INDEX "StakeholderEngagementLog_stakeholderId_followUpAt_idx" ON "StakeholderEngagementLog"("stakeholderId", "followUpAt");
ALTER TABLE "StakeholderEngagementLog" ADD CONSTRAINT "StakeholderEngagementLog_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StakeholderEngagementLog" ADD CONSTRAINT "StakeholderEngagementLog_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StakeholderEngagementLog" ADD CONSTRAINT "StakeholderEngagementLog_stakeholderId_fkey" FOREIGN KEY ("stakeholderId") REFERENCES "Stakeholder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
