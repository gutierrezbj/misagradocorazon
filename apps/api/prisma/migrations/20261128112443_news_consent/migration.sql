-- AlterTable
ALTER TABLE "user" ADD COLUMN     "newsConsent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "newsConsentAt" TIMESTAMP(3);
