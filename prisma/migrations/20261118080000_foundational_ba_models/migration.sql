-- Foundational BA models missing from the original migration history



-- CreateEnum
CREATE TYPE "InitiativeStatus" AS ENUM ('PROPOSED', 'DISCOVERY', 'PLANNING', 'IN_PROGRESS', 'AT_RISK', 'BLOCKED', 'COMPLETED', 'CANCELLED');



-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('UPCOMING', 'IN_PROGRESS', 'COMPLETED', 'AT_RISK');



-- CreateEnum
CREATE TYPE "DocumentImportStatus" AS ENUM ('EXTRACTED', 'NEEDS_REVIEW', 'PARTIALLY_IMPORTED', 'IMPORTED', 'FAILED');



-- CreateEnum
CREATE TYPE "DocumentCandidateType" AS ENUM ('REQUIREMENT', 'ACTION_ITEM', 'FEEDBACK', 'DECISION', 'RISK', 'DEPENDENCY', 'QUESTION');



-- CreateEnum
CREATE TYPE "DocumentCandidateStatus" AS ENUM ('NEEDS_REVIEW', 'APPROVED', 'REJECTED', 'IMPORTED');



-- CreateEnum
CREATE TYPE "DecisionStatus" AS ENUM ('PROPOSED', 'APPROVED', 'REJECTED', 'DEFERRED', 'SUPERSEDED');



-- CreateEnum
CREATE TYPE "RiskStatus" AS ENUM ('IDENTIFIED', 'MITIGATING', 'ACCEPTED', 'CLOSED');



-- CreateEnum
CREATE TYPE "DependencyStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'BLOCKED');



-- AlterTable
ALTER TABLE "ActionItem" ADD COLUMN     "initiativeId" TEXT;



-- AlterTable
ALTER TABLE "Requirement" ADD COLUMN     "initiativeId" TEXT;



-- CreateTable
CREATE TABLE "Initiative" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "objective" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "status" "InitiativeStatus" NOT NULL DEFAULT 'PROPOSED',
    "stageKey" TEXT NOT NULL DEFAULT 'INTAKE',
    "ownerLabel" TEXT,
    "startDate" TIMESTAMP(3),
    "targetDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Initiative_pkey" PRIMARY KEY ("id")
);



-- CreateTable
CREATE TABLE "InitiativeMilestone" (
    "id" TEXT NOT NULL,
    "initiativeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" "MilestoneStatus" NOT NULL DEFAULT 'UPCOMING',
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InitiativeMilestone_pkey" PRIMARY KEY ("id")
);



-- CreateTable
CREATE TABLE "WorkflowStage" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL,
    "isGate" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "transitionRules" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowStage_pkey" PRIMARY KEY ("id")
);



-- CreateTable
CREATE TABLE "WorkflowTransition" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "initiativeId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "fromStageKey" TEXT NOT NULL,
    "toStageKey" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowTransition_pkey" PRIMARY KEY ("id")
);



-- CreateTable
CREATE TABLE "DocumentImport" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileHash" TEXT NOT NULL,
    "extractedText" TEXT NOT NULL,
    "fileContent" BYTEA NOT NULL,
    "extractionNote" TEXT NOT NULL DEFAULT '',
    "status" "DocumentImportStatus" NOT NULL DEFAULT 'NEEDS_REVIEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentImport_pkey" PRIMARY KEY ("id")
);



-- CreateTable
CREATE TABLE "DocumentCandidate" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "type" "DocumentCandidateType" NOT NULL,
    "status" "DocumentCandidateStatus" NOT NULL DEFAULT 'NEEDS_REVIEW',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "ownerLabel" TEXT,
    "dueAt" TIMESTAMP(3),
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "confidence" INTEGER NOT NULL DEFAULT 50,
    "confidenceBand" TEXT NOT NULL DEFAULT 'LOW',
    "sourceReference" TEXT NOT NULL DEFAULT '',
    "rationale" TEXT NOT NULL DEFAULT '',
    "reviewNote" TEXT NOT NULL DEFAULT '',
    "importedEntityId" TEXT,
    "importedEntityType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentCandidate_pkey" PRIMARY KEY ("id")
);



-- CreateTable
CREATE TABLE "Decision" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "context" TEXT NOT NULL DEFAULT '',
    "options" JSONB NOT NULL DEFAULT '[]',
    "rationale" TEXT NOT NULL DEFAULT '',
    "outcome" TEXT NOT NULL DEFAULT '',
    "status" "DecisionStatus" NOT NULL DEFAULT 'PROPOSED',
    "ownerLabel" TEXT,
    "decidedAt" TIMESTAMP(3),
    "initiativeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Decision_pkey" PRIMARY KEY ("id")
);



-- CreateTable
CREATE TABLE "Risk" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "cause" TEXT NOT NULL DEFAULT '',
    "consequence" TEXT NOT NULL DEFAULT '',
    "mitigation" TEXT NOT NULL DEFAULT '',
    "contingency" TEXT NOT NULL DEFAULT '',
    "probability" INTEGER NOT NULL DEFAULT 3,
    "impact" INTEGER NOT NULL DEFAULT 3,
    "status" "RiskStatus" NOT NULL DEFAULT 'IDENTIFIED',
    "ownerLabel" TEXT,
    "reviewDate" TIMESTAMP(3),
    "initiativeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Risk_pkey" PRIMARY KEY ("id")
);



-- CreateTable
CREATE TABLE "Dependency" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "dependencyType" TEXT NOT NULL DEFAULT 'INTERNAL',
    "dependsOn" TEXT NOT NULL DEFAULT '',
    "status" "DependencyStatus" NOT NULL DEFAULT 'OPEN',
    "ownerLabel" TEXT,
    "neededBy" TIMESTAMP(3),
    "initiativeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dependency_pkey" PRIMARY KEY ("id")
);



-- CreateIndex
CREATE INDEX "Initiative_organisationId_productId_status_idx" ON "Initiative"("organisationId", "productId", "status");



-- CreateIndex
CREATE INDEX "Initiative_productId_targetDate_idx" ON "Initiative"("productId", "targetDate");



-- CreateIndex
CREATE INDEX "InitiativeMilestone_initiativeId_sortOrder_idx" ON "InitiativeMilestone"("initiativeId", "sortOrder");



-- CreateIndex
CREATE INDEX "WorkflowStage_organisationId_productId_sortOrder_idx" ON "WorkflowStage"("organisationId", "productId", "sortOrder");



-- CreateIndex
CREATE UNIQUE INDEX "WorkflowStage_productId_key_key" ON "WorkflowStage"("productId", "key");



-- CreateIndex
CREATE INDEX "WorkflowTransition_organisationId_initiativeId_createdAt_idx" ON "WorkflowTransition"("organisationId", "initiativeId", "createdAt");



-- CreateIndex
CREATE INDEX "DocumentImport_organisationId_productId_createdAt_idx" ON "DocumentImport"("organisationId", "productId", "createdAt");



-- CreateIndex
CREATE UNIQUE INDEX "DocumentImport_organisationId_fileHash_key" ON "DocumentImport"("organisationId", "fileHash");



-- CreateIndex
CREATE INDEX "DocumentCandidate_organisationId_productId_status_type_idx" ON "DocumentCandidate"("organisationId", "productId", "status", "type");



-- CreateIndex
CREATE INDEX "DocumentCandidate_importId_sourceReference_idx" ON "DocumentCandidate"("importId", "sourceReference");



-- CreateIndex
CREATE INDEX "Decision_organisationId_productId_status_createdAt_idx" ON "Decision"("organisationId", "productId", "status", "createdAt");



-- CreateIndex
CREATE INDEX "Decision_initiativeId_idx" ON "Decision"("initiativeId");



-- CreateIndex
CREATE INDEX "Risk_organisationId_productId_status_reviewDate_idx" ON "Risk"("organisationId", "productId", "status", "reviewDate");



-- CreateIndex
CREATE INDEX "Risk_initiativeId_idx" ON "Risk"("initiativeId");



-- CreateIndex
CREATE INDEX "Dependency_organisationId_productId_status_neededBy_idx" ON "Dependency"("organisationId", "productId", "status", "neededBy");



-- CreateIndex
CREATE INDEX "Dependency_initiativeId_idx" ON "Dependency"("initiativeId");



-- CreateIndex
CREATE INDEX "ActionItem_initiativeId_idx" ON "ActionItem"("initiativeId");



-- CreateIndex
CREATE INDEX "Requirement_initiativeId_idx" ON "Requirement"("initiativeId");



-- AddForeignKey
ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "Initiative"("id") ON DELETE SET NULL ON UPDATE CASCADE;



-- AddForeignKey
ALTER TABLE "ActionItem" ADD CONSTRAINT "ActionItem_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "Initiative"("id") ON DELETE SET NULL ON UPDATE CASCADE;



-- AddForeignKey
ALTER TABLE "Initiative" ADD CONSTRAINT "Initiative_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;



-- AddForeignKey
ALTER TABLE "Initiative" ADD CONSTRAINT "Initiative_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;



-- AddForeignKey
ALTER TABLE "InitiativeMilestone" ADD CONSTRAINT "InitiativeMilestone_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "Initiative"("id") ON DELETE CASCADE ON UPDATE CASCADE;



-- AddForeignKey
ALTER TABLE "WorkflowStage" ADD CONSTRAINT "WorkflowStage_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;



-- AddForeignKey
ALTER TABLE "WorkflowStage" ADD CONSTRAINT "WorkflowStage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;



-- AddForeignKey
ALTER TABLE "WorkflowTransition" ADD CONSTRAINT "WorkflowTransition_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;



-- AddForeignKey
ALTER TABLE "WorkflowTransition" ADD CONSTRAINT "WorkflowTransition_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "Initiative"("id") ON DELETE CASCADE ON UPDATE CASCADE;



-- AddForeignKey
ALTER TABLE "WorkflowTransition" ADD CONSTRAINT "WorkflowTransition_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;



-- AddForeignKey
ALTER TABLE "DocumentImport" ADD CONSTRAINT "DocumentImport_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;



-- AddForeignKey
ALTER TABLE "DocumentImport" ADD CONSTRAINT "DocumentImport_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;



-- AddForeignKey
ALTER TABLE "DocumentCandidate" ADD CONSTRAINT "DocumentCandidate_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;



-- AddForeignKey
ALTER TABLE "DocumentCandidate" ADD CONSTRAINT "DocumentCandidate_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;



-- AddForeignKey
ALTER TABLE "DocumentCandidate" ADD CONSTRAINT "DocumentCandidate_importId_fkey" FOREIGN KEY ("importId") REFERENCES "DocumentImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;



-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;



-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;



-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "Initiative"("id") ON DELETE SET NULL ON UPDATE CASCADE;



-- AddForeignKey
ALTER TABLE "Risk" ADD CONSTRAINT "Risk_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;



-- AddForeignKey
ALTER TABLE "Risk" ADD CONSTRAINT "Risk_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;



-- AddForeignKey
ALTER TABLE "Risk" ADD CONSTRAINT "Risk_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "Initiative"("id") ON DELETE SET NULL ON UPDATE CASCADE;



-- AddForeignKey
ALTER TABLE "Dependency" ADD CONSTRAINT "Dependency_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;



-- AddForeignKey
ALTER TABLE "Dependency" ADD CONSTRAINT "Dependency_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;



-- AddForeignKey
ALTER TABLE "Dependency" ADD CONSTRAINT "Dependency_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "Initiative"("id") ON DELETE SET NULL ON UPDATE CASCADE;
