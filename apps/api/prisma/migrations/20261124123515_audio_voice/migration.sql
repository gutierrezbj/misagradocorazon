-- AlterTable
ALTER TABLE "daily_content" ADD COLUMN     "meditationAudioVoiceEn" TEXT,
ADD COLUMN     "meditationAudioVoiceEs" TEXT,
ADD COLUMN     "morningAudioVoiceEn" TEXT,
ADD COLUMN     "morningAudioVoiceEs" TEXT,
ADD COLUMN     "nightAudioVoiceEn" TEXT,
ADD COLUMN     "nightAudioVoiceEs" TEXT;

-- AlterTable
ALTER TABLE "saint" ADD COLUMN     "audioVoiceEn" TEXT,
ADD COLUMN     "audioVoiceEs" TEXT;

-- AlterTable
ALTER TABLE "seasonal_prayer" ADD COLUMN     "audioVoiceEn" TEXT,
ADD COLUMN     "audioVoiceEs" TEXT;
