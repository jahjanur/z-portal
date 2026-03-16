-- AlterTable
ALTER TABLE "public"."Notification" ADD COLUMN     "sourceRole" TEXT;

-- CreateIndex
CREATE INDEX "Notification_userId_type_sourceRole_idx" ON "public"."Notification"("userId", "type", "sourceRole");
