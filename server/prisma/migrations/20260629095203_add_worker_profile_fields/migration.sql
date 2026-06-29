-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "avatarEmoji" TEXT,
ADD COLUMN     "nickname" TEXT,
ADD COLUMN     "skills" TEXT[] DEFAULT ARRAY[]::TEXT[];
