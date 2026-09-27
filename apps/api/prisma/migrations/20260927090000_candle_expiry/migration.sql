-- AlterEnum
ALTER TYPE "PushKind" ADD VALUE 'candle_expired';

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "notifyCandleExpiry" BOOLEAN NOT NULL DEFAULT false;

