CREATE TYPE "PersonalActionStatus" AS ENUM ('TODO','IN_PROGRESS','WAITING','DONE','CANCELLED');
CREATE TYPE "PersonalActionPriority" AS ENUM ('LOW','MEDIUM','HIGH','URGENT');
CREATE TYPE "PersonalShareAccess" AS ENUM ('VIEW','EDIT');

CREATE TABLE "PersonalTracker" (
  "id" TEXT NOT NULL,
  "organisationId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PersonalTracker_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "PersonalTrackerShare" (
  "id" TEXT NOT NULL,
  "organisationId" TEXT NOT NULL,
  "trackerId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "access" "PersonalShareAccess" NOT NULL DEFAULT 'VIEW',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PersonalTrackerShare_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "PersonalActionItem" (
  "id" TEXT NOT NULL,
  "organisationId" TEXT NOT NULL,
  "trackerId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "status" "PersonalActionStatus" NOT NULL DEFAULT 'TODO',
  "priority" "PersonalActionPriority" NOT NULL DEFAULT 'MEDIUM',
  "dueAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PersonalActionItem_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "PersonalActionShare" (
  "id" TEXT NOT NULL,
  "organisationId" TEXT NOT NULL,
  "actionItemId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "access" "PersonalShareAccess" NOT NULL DEFAULT 'VIEW',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PersonalActionShare_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "PersonalActionUpdate" (
  "id" TEXT NOT NULL,
  "organisationId" TEXT NOT NULL,
  "actionItemId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "note" TEXT NOT NULL,
  "status" "PersonalActionStatus",
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PersonalActionUpdate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PersonalTrackerShare_trackerId_userId_key" ON "PersonalTrackerShare"("trackerId","userId");
CREATE INDEX "PersonalTrackerShare_organisationId_userId_idx" ON "PersonalTrackerShare"("organisationId","userId");
CREATE INDEX "PersonalTracker_organisationId_productId_ownerId_updatedAt_idx" ON "PersonalTracker"("organisationId","productId","ownerId","updatedAt");
CREATE INDEX "PersonalActionItem_organisationId_trackerId_status_dueAt_idx" ON "PersonalActionItem"("organisationId","trackerId","status","dueAt");
CREATE UNIQUE INDEX "PersonalActionShare_actionItemId_userId_key" ON "PersonalActionShare"("actionItemId","userId");
CREATE INDEX "PersonalActionShare_organisationId_userId_idx" ON "PersonalActionShare"("organisationId","userId");
CREATE INDEX "PersonalActionUpdate_organisationId_actionItemId_createdAt_idx" ON "PersonalActionUpdate"("organisationId","actionItemId","createdAt");

ALTER TABLE "PersonalTracker" ADD CONSTRAINT "PersonalTracker_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PersonalTracker" ADD CONSTRAINT "PersonalTracker_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PersonalTracker" ADD CONSTRAINT "PersonalTracker_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PersonalTrackerShare" ADD CONSTRAINT "PersonalTrackerShare_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PersonalTrackerShare" ADD CONSTRAINT "PersonalTrackerShare_trackerId_fkey" FOREIGN KEY ("trackerId") REFERENCES "PersonalTracker"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PersonalTrackerShare" ADD CONSTRAINT "PersonalTrackerShare_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PersonalActionItem" ADD CONSTRAINT "PersonalActionItem_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PersonalActionItem" ADD CONSTRAINT "PersonalActionItem_trackerId_fkey" FOREIGN KEY ("trackerId") REFERENCES "PersonalTracker"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PersonalActionItem" ADD CONSTRAINT "PersonalActionItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PersonalActionShare" ADD CONSTRAINT "PersonalActionShare_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PersonalActionShare" ADD CONSTRAINT "PersonalActionShare_actionItemId_fkey" FOREIGN KEY ("actionItemId") REFERENCES "PersonalActionItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PersonalActionShare" ADD CONSTRAINT "PersonalActionShare_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PersonalActionUpdate" ADD CONSTRAINT "PersonalActionUpdate_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PersonalActionUpdate" ADD CONSTRAINT "PersonalActionUpdate_actionItemId_fkey" FOREIGN KEY ("actionItemId") REFERENCES "PersonalActionItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PersonalActionUpdate" ADD CONSTRAINT "PersonalActionUpdate_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Missing schema constraints and indexes restored from the verified schema diff


-- CreateIndex



-- CreateIndex
