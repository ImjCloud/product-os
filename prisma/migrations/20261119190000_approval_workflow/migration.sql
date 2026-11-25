CREATE TYPE "ApprovalRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN');

CREATE TABLE "ApprovalRequest" (
  "id" TEXT NOT NULL,
  "organisationId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "rationale" TEXT NOT NULL,
  "requesterUserId" TEXT,
  "approverUserId" TEXT,
  "status" "ApprovalRequestStatus" NOT NULL DEFAULT 'PENDING',
  "decisionNote" TEXT NOT NULL DEFAULT '',
  "dueAt" TIMESTAMP(3),
  "decidedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ApprovalRequest_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ApprovalRequest_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ApprovalRequest_requesterUserId_fkey" FOREIGN KEY ("requesterUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ApprovalRequest_approverUserId_fkey" FOREIGN KEY ("approverUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "ApprovalRequest_organisationId_productId_status_dueAt_idx" ON "ApprovalRequest"("organisationId", "productId", "status", "dueAt");
CREATE INDEX "ApprovalRequest_approverUserId_status_createdAt_idx" ON "ApprovalRequest"("approverUserId", "status", "createdAt");
CREATE INDEX "ApprovalRequest_targetType_targetId_idx" ON "ApprovalRequest"("targetType", "targetId");


-- Missing schema constraints and indexes restored from the verified schema diff


-- AddForeignKey



-- AddForeignKey



-- AddForeignKey



-- AddForeignKey
