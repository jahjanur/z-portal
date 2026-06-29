-- AlterTable
ALTER TABLE "public"."Invite" ADD COLUMN     "companyOwnerId" INTEGER;

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "companyOwnerId" INTEGER;

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_companyOwnerId_fkey" FOREIGN KEY ("companyOwnerId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
