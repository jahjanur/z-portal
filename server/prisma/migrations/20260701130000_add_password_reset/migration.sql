-- AddColumn
ALTER TABLE "public"."User" ADD COLUMN "resetToken" TEXT;
ALTER TABLE "public"."User" ADD COLUMN "resetExpires" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "User_resetToken_key" ON "public"."User"("resetToken");
