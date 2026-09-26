-- AlterTable
ALTER TABLE "user" ADD COLUMN     "analyticsConsent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "analyticsConsentAt" TIMESTAMP(3);

