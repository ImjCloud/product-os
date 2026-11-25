CREATE TABLE "DigestSnapshot" (
 "id" TEXT NOT NULL, "organisationId" TEXT NOT NULL, "productId" TEXT NOT NULL, "title" TEXT NOT NULL,
 "summary" JSONB NOT NULL, "createdById" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "DigestSnapshot_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "DigestSnapshot_organisationId_productId_createdAt_idx" ON "DigestSnapshot"("organisationId", "productId", "createdAt");
ALTER TABLE "DigestSnapshot" ADD CONSTRAINT "DigestSnapshot_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DigestSnapshot" ADD CONSTRAINT "DigestSnapshot_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
