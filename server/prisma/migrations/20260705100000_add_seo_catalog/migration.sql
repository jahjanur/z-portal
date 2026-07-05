-- SEO backlink catalog: packages we resell + activated orders per client

CREATE TABLE "public"."SeoPackage" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "positioning" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "highlights" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "providerName" TEXT,
    "providerPackage" TEXT,
    "providerCost" DOUBLE PRECISION,
    "providerListPrice" DOUBLE PRECISION,
    "backlinks" INTEGER NOT NULL,
    "packageItems" INTEGER NOT NULL,
    "maxKeywords" INTEGER NOT NULL,
    "deliveryDaysMin" INTEGER NOT NULL,
    "deliveryDaysMax" INTEGER NOT NULL,
    "processingHours" INTEGER NOT NULL DEFAULT 24,
    "guaranteeMonths" INTEGER NOT NULL DEFAULT 12,
    "contentPieces" JSONB,
    "backlinkProfile" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeoPackage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."SeoOrder" (
    "id" SERIAL NOT NULL,
    "packageId" INTEGER NOT NULL,
    "clientId" INTEGER NOT NULL,
    "taskId" INTEGER,
    "invoiceId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'AWAITING_INFO',
    "websiteUrl" TEXT,
    "sector" TEXT,
    "language" TEXT DEFAULT 'Turkish',
    "chooseLinks" BOOLEAN NOT NULL DEFAULT false,
    "keywords" JSONB,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "infoAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "SeoOrder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SeoOrder_taskId_key" ON "public"."SeoOrder"("taskId");
CREATE INDEX "SeoOrder_clientId_idx" ON "public"."SeoOrder"("clientId");

ALTER TABLE "public"."SeoOrder" ADD CONSTRAINT "SeoOrder_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "public"."SeoPackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."SeoOrder" ADD CONSTRAINT "SeoOrder_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."SeoOrder" ADD CONSTRAINT "SeoOrder_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "public"."Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
