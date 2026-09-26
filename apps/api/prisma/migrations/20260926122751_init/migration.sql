-- CreateEnum
CREATE TYPE "Role" AS ENUM ('user', 'moderator', 'editor', 'superadmin');

-- CreateEnum
CREATE TYPE "Locale" AS ENUM ('es', 'en');

-- CreateEnum
CREATE TYPE "CandleType" AS ENUM ('basic', 'solemn', 'permanent');

-- CreateEnum
CREATE TYPE "CandleCategory" AS ENUM ('general', 'difuntos');

-- CreateEnum
CREATE TYPE "PrayerKind" AS ENUM ('morning', 'night');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('purchase', 'impact_allocation', 'transfer');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'user',
    "blocked" BOOLEAN NOT NULL DEFAULT false,
    "onboarded" BOOLEAN NOT NULL DEFAULT false,
    "patronSaintId" TEXT,
    "secondarySaintIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "language" "Locale" NOT NULL DEFAULT 'es',
    "timezone" TEXT NOT NULL DEFAULT 'America/Mexico_City',
    "morningTime" TEXT NOT NULL DEFAULT '07:30',
    "angelusTime" TEXT NOT NULL DEFAULT '12:00',
    "nightTime" TEXT NOT NULL DEFAULT '21:30',

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saint" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "feastDate" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "audioUrlEs" TEXT,
    "audioUrlEn" TEXT,
    "historyEs" TEXT NOT NULL,
    "historyEn" TEXT NOT NULL,
    "patronagesEs" TEXT NOT NULL,
    "patronagesEn" TEXT NOT NULL,
    "prayerEs" TEXT NOT NULL,
    "prayerEn" TEXT NOT NULL,
    "isPatronCatalog" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_content" (
    "date" TEXT NOT NULL,
    "saintOfDayId" TEXT,
    "gospelRef" TEXT NOT NULL,
    "gospelEs" TEXT NOT NULL,
    "gospelEn" TEXT NOT NULL,
    "meditationEs" TEXT NOT NULL,
    "meditationEn" TEXT NOT NULL,
    "meditationAudioUrl" TEXT,
    "morningPrayerEs" TEXT NOT NULL,
    "morningPrayerEn" TEXT NOT NULL,
    "nightPrayerEs" TEXT NOT NULL,
    "nightPrayerEn" TEXT NOT NULL,
    "morningAudioUrl" TEXT,
    "nightAudioUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_content_pkey" PRIMARY KEY ("date")
);

-- CreateTable
CREATE TABLE "prayer_log" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "localDate" TEXT NOT NULL,
    "kind" "PrayerKind" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prayer_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candle" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "saintId" TEXT NOT NULL,
    "intentionEncrypted" TEXT NOT NULL,
    "type" "CandleType" NOT NULL,
    "category" "CandleCategory" NOT NULL DEFAULT 'general',
    "priceCents" INTEGER NOT NULL,
    "paymentProvider" TEXT NOT NULL,
    "paymentRef" TEXT NOT NULL,
    "litAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_entry" (
    "id" TEXT NOT NULL,
    "type" "LedgerEntryType" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "month" TEXT NOT NULL,
    "candleId" TEXT,
    "causeId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE INDEX "prayer_log_userId_localDate_idx" ON "prayer_log"("userId", "localDate");

-- CreateIndex
CREATE UNIQUE INDEX "prayer_log_userId_localDate_kind_key" ON "prayer_log"("userId", "localDate", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "candle_paymentRef_key" ON "candle"("paymentRef");

-- CreateIndex
CREATE INDEX "candle_userId_litAt_idx" ON "candle"("userId", "litAt");

-- CreateIndex
CREATE INDEX "candle_expiresAt_idx" ON "candle"("expiresAt");

-- CreateIndex
CREATE INDEX "ledger_entry_month_type_idx" ON "ledger_entry"("month", "type");

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_patronSaintId_fkey" FOREIGN KEY ("patronSaintId") REFERENCES "saint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_content" ADD CONSTRAINT "daily_content_saintOfDayId_fkey" FOREIGN KEY ("saintOfDayId") REFERENCES "saint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prayer_log" ADD CONSTRAINT "prayer_log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candle" ADD CONSTRAINT "candle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candle" ADD CONSTRAINT "candle_saintId_fkey" FOREIGN KEY ("saintId") REFERENCES "saint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entry" ADD CONSTRAINT "ledger_entry_candleId_fkey" FOREIGN KEY ("candleId") REFERENCES "candle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Libro de movimientos de solo inserción (ADR-015): la base de datos rechaza UPDATE y DELETE.
CREATE FUNCTION ledger_entry_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'ledger_entry es de solo inserción: % no permitido', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ledger_entry_no_update_delete
  BEFORE UPDATE OR DELETE ON "ledger_entry"
  FOR EACH ROW EXECUTE FUNCTION ledger_entry_append_only();
