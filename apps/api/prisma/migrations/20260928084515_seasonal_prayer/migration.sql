-- CreateEnum
CREATE TYPE "LiturgicalSeason" AS ENUM ('advent', 'christmas', 'lent', 'easter', 'ordinary');

-- AlterTable
ALTER TABLE "daily_content" ALTER COLUMN "morningPrayerEs" DROP NOT NULL,
ALTER COLUMN "morningPrayerEn" DROP NOT NULL,
ALTER COLUMN "nightPrayerEs" DROP NOT NULL,
ALTER COLUMN "nightPrayerEn" DROP NOT NULL;

-- CreateTable
CREATE TABLE "seasonal_prayer" (
    "season" "LiturgicalSeason" NOT NULL,
    "kind" "PrayerKind" NOT NULL,
    "textEs" TEXT NOT NULL,
    "textEn" TEXT NOT NULL,
    "audioUrlEs" TEXT,
    "audioUrlEn" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seasonal_prayer_pkey" PRIMARY KEY ("season","kind")
);
