-- AlterTable
ALTER TABLE "public"."Milestone" ADD COLUMN     "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];
