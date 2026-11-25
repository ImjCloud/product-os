-- Support the stable composite ordering used by cursor-paginated workspace lists.
CREATE INDEX "Feedback_organisationId_productId_occurredAt_id_idx"
  ON "Feedback"("organisationId", "productId", "occurredAt", "id");

CREATE INDEX "Requirement_organisationId_productId_updatedAt_id_idx"
  ON "Requirement"("organisationId", "productId", "updatedAt", "id");

CREATE INDEX "ActionItem_organisationId_productId_createdAt_id_idx"
  ON "ActionItem"("organisationId", "productId", "createdAt", "id");

CREATE INDEX "ActionItem_organisationId_productId_visibility_createdAt_id_idx"
  ON "ActionItem"("organisationId", "productId", "visibility", "createdAt", "id");
