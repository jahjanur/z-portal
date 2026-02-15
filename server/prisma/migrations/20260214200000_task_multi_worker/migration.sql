-- CreateTable
CREATE TABLE "TaskWorker" (
    "id" SERIAL NOT NULL,
    "taskId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "TaskWorker_pkey" PRIMARY KEY ("id")
);

-- Migrate existing single worker to TaskWorker
INSERT INTO "TaskWorker" ("taskId", "userId")
SELECT "id", "workerId" FROM "Task" WHERE "workerId" IS NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "TaskWorker_taskId_userId_key" ON "TaskWorker"("taskId", "userId");
CREATE INDEX "TaskWorker_taskId_idx" ON "TaskWorker"("taskId");
CREATE INDEX "TaskWorker_userId_idx" ON "TaskWorker"("userId");

-- DropForeignKey (Task_workerId_fkey if exists)
ALTER TABLE "Task" DROP CONSTRAINT IF EXISTS "Task_workerId_fkey";

-- DropColumn
ALTER TABLE "Task" DROP COLUMN "workerId";

-- AddForeignKey
ALTER TABLE "TaskWorker" ADD CONSTRAINT "TaskWorker_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskWorker" ADD CONSTRAINT "TaskWorker_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
