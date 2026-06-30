-- AlterTable
ALTER TABLE "public"."Milestone" ADD COLUMN     "deployed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pushedToGithub" BOOLEAN NOT NULL DEFAULT false;
