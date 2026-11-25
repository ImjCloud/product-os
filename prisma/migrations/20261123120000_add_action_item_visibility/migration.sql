CREATE TYPE "ActionItemVisibility" AS ENUM ('PRIVATE', 'SHARED');

-- Existing tasks were workspace-visible before privacy controls existed.
-- Preserve that behaviour for current users while making new tasks private by default.
ALTER TABLE "ActionItem"
  ADD COLUMN "visibility" "ActionItemVisibility" NOT NULL DEFAULT 'SHARED';

ALTER TABLE "ActionItem"
  ALTER COLUMN "visibility" SET DEFAULT 'PRIVATE';

CREATE INDEX "ActionItem_organisationId_productId_visibility_createdById_idx"
  ON "ActionItem"("organisationId", "productId", "visibility", "createdById");
