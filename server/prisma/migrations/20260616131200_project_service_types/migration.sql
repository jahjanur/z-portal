-- AlterTable
ALTER TABLE "public"."Project" ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "serviceType" TEXT NOT NULL DEFAULT 'OTHER';
