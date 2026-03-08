-- AlterTable
ALTER TABLE "public"."Domain" ADD COLUMN     "activationDate" TIMESTAMP(3),
ADD COLUMN     "activationEmailSentAt" TIMESTAMP(3),
ADD COLUMN     "expirationDate" TIMESTAMP(3),
ADD COLUMN     "lifespanYears" INTEGER,
ADD COLUMN     "renewalReminderSentAt" TIMESTAMP(3),
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "Domain_expirationDate_idx" ON "public"."Domain"("expirationDate");
