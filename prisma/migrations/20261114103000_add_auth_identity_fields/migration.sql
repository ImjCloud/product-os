ALTER TABLE "User"
  ADD COLUMN "passwordHash" TEXT,
  ADD COLUMN "entraObjectId" TEXT,
  ADD COLUMN "entraTenantId" TEXT;

CREATE UNIQUE INDEX "User_entraObjectId_key" ON "User"("entraObjectId");
