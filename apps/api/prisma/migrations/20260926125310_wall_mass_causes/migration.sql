-- CreateEnum
CREATE TYPE "IntentionCategory" AS ENUM ('salud', 'familia', 'trabajo', 'difuntos', 'agradecimiento', 'general');

-- CreateEnum
CREATE TYPE "ModerationStatus" AS ENUM ('pending', 'approved', 'hidden');

-- CreateEnum
CREATE TYPE "CauseStatus" AS ENUM ('candidate', 'voting', 'won', 'funded', 'archived');

-- CreateTable
CREATE TABLE "intention" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "category" "IntentionCategory" NOT NULL DEFAULT 'general',
    "status" "ModerationStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "intention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intention_prayer" (
    "intentionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "intention_prayer_pkey" PRIMARY KEY ("intentionId","userId")
);

-- CreateTable
CREATE TABLE "private_intention" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "textEncrypted" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "private_intention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moderation_word" (
    "word" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moderation_word_pkey" PRIMARY KEY ("word")
);

-- CreateTable
CREATE TABLE "admin_audit_log" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mass" (
    "id" TEXT NOT NULL,
    "titleEs" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "youtubeUrl" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "durationMin" INTEGER NOT NULL DEFAULT 120,
    "isSpecial" BOOLEAN NOT NULL DEFAULT false,
    "recordingUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_message" (
    "id" TEXT NOT NULL,
    "massId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "status" "ModerationStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cause" (
    "id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "nameEs" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "responsible" TEXT NOT NULL,
    "descriptionEs" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL,
    "budgetCents" INTEGER NOT NULL,
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "timeline" TEXT NOT NULL,
    "status" "CauseStatus" NOT NULL DEFAULT 'candidate',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cause_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cause_update" (
    "id" TEXT NOT NULL,
    "causeId" TEXT NOT NULL,
    "textEs" TEXT NOT NULL,
    "textEn" TEXT NOT NULL,
    "photoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cause_update_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vote" (
    "userId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "causeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vote_pkey" PRIMARY KEY ("userId","month")
);

-- CreateIndex
CREATE INDEX "intention_status_createdAt_idx" ON "intention"("status", "createdAt");

-- CreateIndex
CREATE INDEX "private_intention_userId_createdAt_idx" ON "private_intention"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "admin_audit_log_entity_entityId_idx" ON "admin_audit_log"("entity", "entityId");

-- CreateIndex
CREATE INDEX "admin_audit_log_createdAt_idx" ON "admin_audit_log"("createdAt");

-- CreateIndex
CREATE INDEX "mass_scheduledAt_idx" ON "mass"("scheduledAt");

-- CreateIndex
CREATE INDEX "chat_message_massId_status_createdAt_idx" ON "chat_message"("massId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "cause_month_status_idx" ON "cause"("month", "status");

-- CreateIndex
CREATE INDEX "cause_update_causeId_createdAt_idx" ON "cause_update"("causeId", "createdAt");

-- CreateIndex
CREATE INDEX "vote_causeId_idx" ON "vote"("causeId");

-- AddForeignKey
ALTER TABLE "ledger_entry" ADD CONSTRAINT "ledger_entry_causeId_fkey" FOREIGN KEY ("causeId") REFERENCES "cause"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intention" ADD CONSTRAINT "intention_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intention_prayer" ADD CONSTRAINT "intention_prayer_intentionId_fkey" FOREIGN KEY ("intentionId") REFERENCES "intention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intention_prayer" ADD CONSTRAINT "intention_prayer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "private_intention" ADD CONSTRAINT "private_intention_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_massId_fkey" FOREIGN KEY ("massId") REFERENCES "mass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cause_update" ADD CONSTRAINT "cause_update_causeId_fkey" FOREIGN KEY ("causeId") REFERENCES "cause"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vote" ADD CONSTRAINT "vote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vote" ADD CONSTRAINT "vote_causeId_fkey" FOREIGN KEY ("causeId") REFERENCES "cause"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Lista inicial de moderación: configuración operativa, no contenido de ejemplo.
-- Normalizada (minúsculas, sin tildes). Se gestiona después desde el panel.
INSERT INTO "moderation_word" ("word") VALUES
  ('milagro garantizado'),
  ('cadena de oracion'),
  ('reenvia esto'),
  ('brujeria'),
  ('amuleto'),
  ('maldicion')
ON CONFLICT DO NOTHING;
