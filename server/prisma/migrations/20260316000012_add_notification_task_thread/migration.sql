-- AlterTable
ALTER TABLE "public"."Notification" ADD COLUMN     "taskId" INTEGER,
ADD COLUMN     "threadType" TEXT;

-- CreateIndex
CREATE INDEX "Notification_userId_taskId_threadType_idx" ON "public"."Notification"("userId", "taskId", "threadType");
