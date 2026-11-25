CREATE TYPE "ActionItemStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE');
CREATE TYPE "ActionItemPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

CREATE TABLE "ActionItem" (
  "id" TEXT NOT NULL,
  "organisationId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "status" "ActionItemStatus" NOT NULL DEFAULT 'TODO',
  "priority" "ActionItemPriority" NOT NULL DEFAULT 'MEDIUM',
  "assigneeId" TEXT,
  "assigneeLabel" TEXT,
  "dueAt" TIMESTAMP(3),
  "feedbackId" TEXT,
  "requirementId" TEXT,
  "releaseId" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ActionItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ActionItem_organisationId_productId_status_priority_idx" ON "ActionItem"("organisationId", "productId", "status", "priority");
CREATE INDEX "ActionItem_organisationId_assigneeId_dueAt_idx" ON "ActionItem"("organisationId", "assigneeId", "dueAt");
CREATE INDEX "ActionItem_feedbackId_idx" ON "ActionItem"("feedbackId");
CREATE INDEX "ActionItem_requirementId_idx" ON "ActionItem"("requirementId");
CREATE INDEX "ActionItem_releaseId_idx" ON "ActionItem"("releaseId");

ALTER TABLE "ActionItem" ADD CONSTRAINT "ActionItem_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ActionItem" ADD CONSTRAINT "ActionItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ActionItem" ADD CONSTRAINT "ActionItem_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ActionItem" ADD CONSTRAINT "ActionItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActionItem" ADD CONSTRAINT "ActionItem_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "Feedback"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ActionItem" ADD CONSTRAINT "ActionItem_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ActionItem" ADD CONSTRAINT "ActionItem_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "Release"("id") ON DELETE SET NULL ON UPDATE CASCADE;
