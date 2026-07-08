-- CreateTable
CREATE TABLE "public"."Server" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "provider" TEXT,
    "ipAddress" TEXT,
    "plan" TEXT,
    "location" TEXT,
    "notes" TEXT,
    "activationDate" TIMESTAMP(3),
    "expirationDate" TIMESTAMP(3),
    "lifespanYears" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "renewalReminderSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Server_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Server_clientId_idx" ON "public"."Server"("clientId");

-- CreateIndex
CREATE INDEX "Server_expirationDate_idx" ON "public"."Server"("expirationDate");

-- AddForeignKey
ALTER TABLE "public"."Server" ADD CONSTRAINT "Server_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
