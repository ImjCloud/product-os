-- Increment 32: keep the personal review date separate from the action target date.
ALTER TABLE "PersonalActionItem" ADD COLUMN "followUpAt" TIMESTAMP(3);
CREATE INDEX "PersonalActionItem_organisationId_trackerId_followUpAt_idx"
  ON "PersonalActionItem"("organisationId", "trackerId", "followUpAt");
