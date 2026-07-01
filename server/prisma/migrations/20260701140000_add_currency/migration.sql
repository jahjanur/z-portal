-- Invoice currency
ALTER TABLE "public"."Invoice" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'USD';

-- App-wide settings (singleton row id=1) with display currency + exchange rates
CREATE TABLE "public"."AppSetting" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "displayCurrency" TEXT NOT NULL DEFAULT 'USD',
    "usdPerEur" DOUBLE PRECISION NOT NULL DEFAULT 1.08,
    "usdPerCad" DOUBLE PRECISION NOT NULL DEFAULT 0.73,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("id")
);

-- Seed the singleton row
INSERT INTO "public"."AppSetting" ("id", "displayCurrency", "usdPerEur", "usdPerCad")
VALUES (1, 'USD', 1.08, 0.73)
ON CONFLICT ("id") DO NOTHING;
