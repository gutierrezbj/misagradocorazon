-- CreateEnum
CREATE TYPE "PushKind" AS ENUM ('morning', 'night', 'saint_of_day', 'voting_result', 'campaign');

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "notifyCommunity" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyMorning" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyNight" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifySaint" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "push_token" (
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_token_pkey" PRIMARY KEY ("token")
);

-- CreateTable
CREATE TABLE "push_delivery" (
    "userId" TEXT NOT NULL,
    "kind" "PushKind" NOT NULL,
    "ref" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_delivery_pkey" PRIMARY KEY ("userId","kind","ref")
);

-- CreateTable
CREATE TABLE "push_ticket" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_campaign" (
    "id" TEXT NOT NULL,
    "titleEs" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "bodyEs" TEXT NOT NULL,
    "bodyEn" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "recipients" INTEGER,

    CONSTRAINT "push_campaign_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "push_token_userId_idx" ON "push_token"("userId");

-- CreateIndex
CREATE INDEX "push_delivery_kind_createdAt_idx" ON "push_delivery"("kind", "createdAt");

-- CreateIndex
CREATE INDEX "push_ticket_createdAt_idx" ON "push_ticket"("createdAt");

-- CreateIndex
CREATE INDEX "push_campaign_sentAt_idx" ON "push_campaign"("sentAt");

-- AddForeignKey
ALTER TABLE "push_token" ADD CONSTRAINT "push_token_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_delivery" ADD CONSTRAINT "push_delivery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_campaign" ADD CONSTRAINT "push_campaign_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
