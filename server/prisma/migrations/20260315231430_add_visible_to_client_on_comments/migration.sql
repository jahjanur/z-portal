-- AlterTable
ALTER TABLE "public"."FileComment" ADD COLUMN     "visibleToClient" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."TaskComment" ADD COLUMN     "visibleToClient" BOOLEAN NOT NULL DEFAULT false;
