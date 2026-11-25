-- Product OS initial relational schema. Authentication-specific columns are added by the next migration.
CREATE TYPE "MembershipRole" AS ENUM ('OWNER', 'ADMIN', 'PRODUCT_MANAGER', 'CONTRIBUTOR', 'VIEWER');
CREATE TYPE "FeedbackStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'DONE');
CREATE TYPE "Sentiment" AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE');
CREATE TYPE "Severity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "RequirementStatus" AS ENUM ('DISCOVERY', 'SCOPED', 'IN_BUILD', 'SHIPPED');
CREATE TYPE "ReleaseStatus" AS ENUM ('PLANNING', 'READY', 'RELEASED');
CREATE TYPE "MetricDirection" AS ENUM ('HIGHER_IS_BETTER', 'LOWER_IS_BETTER');

CREATE TABLE "Organisation" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Organisation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Organisation_slug_key" ON "Organisation"("slug");

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE TABLE "Membership" (
  "id" TEXT NOT NULL,
  "organisationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "MembershipRole" NOT NULL DEFAULT 'CONTRIBUTOR',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Membership_organisationId_userId_key" ON "Membership"("organisationId", "userId");
CREATE INDEX "Membership_userId_role_idx" ON "Membership"("userId", "role");

CREATE TABLE "Product" (
  "id" TEXT NOT NULL,
  "organisationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Product_organisationId_name_key" ON "Product"("organisationId", "name");
CREATE INDEX "Product_organisationId_createdAt_idx" ON "Product"("organisationId", "createdAt");

CREATE TABLE "Release" (
  "id" TEXT NOT NULL,
  "organisationId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "targetDate" TIMESTAMP(3),
  "status" "ReleaseStatus" NOT NULL DEFAULT 'PLANNING',
  "decisionLog" JSONB NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Release_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Release_productId_version_key" ON "Release"("productId", "version");
CREATE INDEX "Release_organisationId_targetDate_status_idx" ON "Release"("organisationId", "targetDate", "status");

CREATE TABLE "Requirement" (
  "id" TEXT NOT NULL,
  "organisationId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "problem" TEXT NOT NULL DEFAULT '',
  "userStory" TEXT NOT NULL DEFAULT '',
  "acceptance" TEXT NOT NULL DEFAULT '',
  "status" "RequirementStatus" NOT NULL DEFAULT 'DISCOVERY',
  "owner" TEXT,
  "reach" INTEGER NOT NULL DEFAULT 100,
  "impact" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "confidence" DOUBLE PRECISION NOT NULL DEFAULT 50,
  "effort" DOUBLE PRECISION NOT NULL DEFAULT 2,
  "releaseId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Requirement_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Requirement_organisationId_productId_status_idx" ON "Requirement"("organisationId", "productId", "status");
CREATE INDEX "Requirement_releaseId_idx" ON "Requirement"("releaseId");

CREATE TABLE "Feedback" (
  "id" TEXT NOT NULL,
  "organisationId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'Internal',
  "segment" TEXT,
  "theme" TEXT,
  "sentiment" "Sentiment" NOT NULL DEFAULT 'NEUTRAL',
  "severity" "Severity" NOT NULL DEFAULT 'MEDIUM',
  "status" "FeedbackStatus" NOT NULL DEFAULT 'OPEN',
  "owner" TEXT,
  "dueAt" TIMESTAMP(3),
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "externalRef" TEXT,
  "sourceUrl" TEXT,
  "requirementId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Feedback_organisationId_productId_status_idx" ON "Feedback"("organisationId", "productId", "status");
CREATE INDEX "Feedback_organisationId_dueAt_idx" ON "Feedback"("organisationId", "dueAt");
CREATE INDEX "Feedback_externalRef_idx" ON "Feedback"("externalRef");

CREATE TABLE "ReleaseCheck" (
  "id" TEXT NOT NULL,
  "releaseId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "completed" BOOLEAN NOT NULL DEFAULT false,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReleaseCheck_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ReleaseCheck_releaseId_key_key" ON "ReleaseCheck"("releaseId", "key");

CREATE TABLE "Metric" (
  "id" TEXT NOT NULL,
  "organisationId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "releaseId" TEXT,
  "name" TEXT NOT NULL,
  "unit" TEXT,
  "direction" "MetricDirection" NOT NULL DEFAULT 'HIGHER_IS_BETTER',
  "baseline" DOUBLE PRECISION NOT NULL,
  "target" DOUBLE PRECISION NOT NULL,
  "actual" DOUBLE PRECISION NOT NULL,
  "reviewDate" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Metric_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Metric_organisationId_productId_reviewDate_idx" ON "Metric"("organisationId", "productId", "reviewDate");

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "organisationId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "before" JSONB,
  "after" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AuditLog_organisationId_entityType_entityId_createdAt_idx" ON "AuditLog"("organisationId", "entityType", "entityId", "createdAt");

ALTER TABLE "Membership" ADD CONSTRAINT "Membership_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Release" ADD CONSTRAINT "Release_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Release" ADD CONSTRAINT "Release_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "Release"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReleaseCheck" ADD CONSTRAINT "ReleaseCheck_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "Release"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Metric" ADD CONSTRAINT "Metric_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Metric" ADD CONSTRAINT "Metric_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Metric" ADD CONSTRAINT "Metric_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "Release"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
