-- Add hosting tracking fields to Domain (additive, nullable — safe on existing data)
ALTER TABLE "Domain" ADD COLUMN "hostingProvider" TEXT;
ALTER TABLE "Domain" ADD COLUMN "hostingPlan" TEXT;
ALTER TABLE "Domain" ADD COLUMN "hostingExpiry" TIMESTAMP(3);
