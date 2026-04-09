-- CreateEnum
CREATE TYPE "public"."FileReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'NEEDS_REVISION', 'REJECTED');

-- AlterTable
ALTER TABLE "public"."TaskFile" ADD COLUMN     "reviewComment" TEXT,
ADD COLUMN     "reviewStatus" "public"."FileReviewStatus" NOT NULL DEFAULT 'PENDING';
