-- Audio del contenido diario por idioma (SDD-05 US-07).
-- Las URLs existentes (si las hubiera) se conservan como audio en español.
ALTER TABLE "daily_content" RENAME COLUMN "meditationAudioUrl" TO "meditationAudioUrlEs";
ALTER TABLE "daily_content" RENAME COLUMN "morningAudioUrl" TO "morningAudioUrlEs";
ALTER TABLE "daily_content" RENAME COLUMN "nightAudioUrl" TO "nightAudioUrlEs";
ALTER TABLE "daily_content"
  ADD COLUMN "meditationAudioUrlEn" TEXT,
  ADD COLUMN "morningAudioUrlEn" TEXT,
  ADD COLUMN "nightAudioUrlEn" TEXT;
