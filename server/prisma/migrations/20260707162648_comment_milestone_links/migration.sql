-- CreateTable
CREATE TABLE "public"."CommentMilestoneLink" (
    "id" SERIAL NOT NULL,
    "commentId" INTEGER NOT NULL,
    "milestoneId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommentMilestoneLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommentMilestoneLink_commentId_idx" ON "public"."CommentMilestoneLink"("commentId");

-- CreateIndex
CREATE INDEX "CommentMilestoneLink_milestoneId_idx" ON "public"."CommentMilestoneLink"("milestoneId");

-- CreateIndex
CREATE UNIQUE INDEX "CommentMilestoneLink_commentId_milestoneId_key" ON "public"."CommentMilestoneLink"("commentId", "milestoneId");

-- AddForeignKey
ALTER TABLE "public"."CommentMilestoneLink" ADD CONSTRAINT "CommentMilestoneLink_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "public"."TaskComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CommentMilestoneLink" ADD CONSTRAINT "CommentMilestoneLink_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "public"."Milestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;
