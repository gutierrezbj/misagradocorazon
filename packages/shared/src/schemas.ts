// Esquemas de validación: única definición de los contratos de la API (SDD-06).
import { z } from "zod";

import { CANDLE_CATEGORIES, CANDLE_TYPE_KEYS, INTENTION_CATEGORIES, LOCALES, ROLES } from "./domain.ts";

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Formato HH:MM");

export const roleSchema = z.enum(ROLES);
export const localeSchema = z.enum(LOCALES);

export const onboardingSchema = z.object({
  patronSaintId: z.string().min(1),
  secondarySaintIds: z.array(z.string().min(1)).max(10).default([]),
  morningTime: hhmm.default("07:30"),
  angelusTime: hhmm.default("12:00"),
  nightTime: hhmm.default("21:30"),
  language: localeSchema.default("es"),
  // Zona horaria IANA del dispositivo (p. ej. "America/Los_Angeles"); define el "hoy" del fiel.
  timezone: z.string().min(1).max(64).optional(),
});
export type OnboardingInput = z.infer<typeof onboardingSchema>;

export const notificationPrefsSchema = z.object({
  notifyMorning: z.boolean(),
  notifyNight: z.boolean(),
  notifySaint: z.boolean(),
  notifyCommunity: z.boolean(),
});
export type NotificationPrefs = z.infer<typeof notificationPrefsSchema>;

export const profileUpdateSchema = onboardingSchema
  .omit({ patronSaintId: true })
  .extend({ patronSaintId: z.string().min(1) })
  .extend(notificationPrefsSchema.shape)
  .partial();
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

export const prayerCompleteSchema = z.object({ kind: z.enum(["morning", "night"]) });
export type PrayerCompleteInput = z.infer<typeof prayerCompleteSchema>;

export const lightCandleSchema = z.object({
  saintId: z.string().min(1),
  intention: z.string().trim().min(1).max(200),
  type: z.enum(CANDLE_TYPE_KEYS as [string, ...string[]]),
  category: z.enum(CANDLE_CATEGORIES).default("general"),
});
export type LightCandleInput = z.infer<typeof lightCandleSchema>;

export const intentionSchema = z.object({
  text: z.string().trim().min(1).max(500),
  category: z.enum(INTENTION_CATEGORIES).default("general"),
});
export type IntentionInput = z.infer<typeof intentionSchema>;

export const chatMessageSchema = z.object({
  text: z.string().trim().min(1).max(300),
});
export type ChatMessageInput = z.infer<typeof chatMessageSchema>;

export const privateIntentionSchema = z.object({
  text: z.string().trim().min(1).max(500),
});
export type PrivateIntentionInput = z.infer<typeof privateIntentionSchema>;

export const moderationDecisionSchema = z.object({
  action: z.enum(["approve", "hide"]),
  reason: z.string().trim().max(300).optional(),
});
export type ModerationDecisionInput = z.infer<typeof moderationDecisionSchema>;

export const moderationWordSchema = z.object({
  word: z.string().trim().min(2).max(60),
});

const yearMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Formato YYYY-MM");

export const causeInputSchema = z.object({
  month: yearMonth,
  nameEs: z.string().trim().min(1).max(120),
  nameEn: z.string().trim().min(1).max(120),
  location: z.string().trim().min(1).max(120),
  responsible: z.string().trim().min(1).max(120),
  descriptionEs: z.string().trim().min(1).max(4000),
  descriptionEn: z.string().trim().min(1).max(4000),
  budgetCents: z.number().int().positive(),
  photos: z.array(z.url()).max(12).default([]),
  timeline: z.string().trim().min(1).max(120),
});
export type CauseInput = z.infer<typeof causeInputSchema>;

export const causeUpdateInputSchema = z.object({
  textEs: z.string().trim().min(1).max(2000),
  textEn: z.string().trim().min(1).max(2000),
  photoUrl: z.url().optional(),
});
export type CauseUpdateInput = z.infer<typeof causeUpdateInputSchema>;

export const massInputSchema = z.object({
  titleEs: z.string().trim().min(1).max(160),
  titleEn: z.string().trim().min(1).max(160),
  youtubeUrl: z.url(),
  scheduledAt: z.iso.datetime({ offset: true }),
  durationMin: z.number().int().min(15).max(480).default(120),
  isSpecial: z.boolean().default(false),
  recordingUrl: z.url().optional(),
});
export type MassInput = z.infer<typeof massInputSchema>;

// Notificaciones push: token de Expo del dispositivo.
export const pushTokenSchema = z.object({
  token: z.string().regex(/^Expo(nent)?PushToken\[[^\]]+\]$/, "Token de Expo no válido"),
  platform: z.enum(["ios", "android"]),
});
export type PushTokenInput = z.infer<typeof pushTokenSchema>;

// Avisos del equipo (panel). Longitudes pensadas para que el texto no se corte en la pantalla de bloqueo.
export const pushCampaignSchema = z.object({
  titleEs: z.string().trim().min(1).max(60),
  titleEn: z.string().trim().min(1).max(60),
  bodyEs: z.string().trim().min(1).max(180),
  bodyEn: z.string().trim().min(1).max(180),
});
export type PushCampaignInput = z.infer<typeof pushCampaignSchema>;

// --- Gestión de contenido (panel) -------------------------------------------

// Subidas a R2: tipos y tamaños admitidos. El audio lo graba el equipo (MP3 o M4A).
export const UPLOAD_RULES = {
  image: { maxBytes: 5 * 1024 * 1024, types: { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } },
  audio: {
    maxBytes: 50 * 1024 * 1024,
    types: { "audio/mpeg": "mp3", "audio/mp4": "m4a", "audio/x-m4a": "m4a", "audio/aac": "aac" },
  },
} as const;
export type UploadKind = keyof typeof UPLOAD_RULES;

export const uploadRequestSchema = z
  .object({
    kind: z.enum(["image", "audio"]),
    contentType: z.string().min(1),
    size: z.number().int().positive(),
  })
  .superRefine((v, ctx) => {
    const rule = UPLOAD_RULES[v.kind];
    if (!(v.contentType in rule.types)) ctx.addIssue({ code: "custom", path: ["contentType"], message: "Tipo de fichero no admitido" });
    if (v.size > rule.maxBytes) ctx.addIssue({ code: "custom", path: ["size"], message: "Fichero demasiado grande" });
  });
export type UploadRequest = z.infer<typeof uploadRequestSchema>;

const httpsUrl = z.url({ protocol: /^https?$/ });
const optionalUrl = httpsUrl.nullable().optional();

export const saintInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  feastDate: z.string().regex(/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, "Formato MM-DD"),
  imageUrl: httpsUrl,
  audioUrlEs: optionalUrl,
  audioUrlEn: optionalUrl,
  historyEs: z.string().trim().min(1).max(5000),
  historyEn: z.string().trim().min(1).max(5000),
  patronagesEs: z.string().trim().max(500).default(""),
  patronagesEn: z.string().trim().max(500).default(""),
  prayerEs: z.string().trim().max(3000).default(""),
  prayerEn: z.string().trim().max(3000).default(""),
  isPatronCatalog: z.boolean().default(false),
  sortOrder: z.number().int().min(0).max(10000).default(100),
});
export type SaintInput = z.infer<typeof saintInputSchema>;
export const saintUpdateSchema = saintInputSchema.partial();

export const dailyContentInputSchema = z.object({
  saintOfDayId: z.string().min(1).nullable().optional(),
  gospelRef: z.string().trim().min(1).max(120),
  gospelEs: z.string().trim().min(1).max(8000),
  gospelEn: z.string().trim().min(1).max(8000),
  meditationEs: z.string().trim().min(1).max(8000),
  meditationEn: z.string().trim().min(1).max(8000),
  morningPrayerEs: z.string().trim().min(1).max(3000),
  morningPrayerEn: z.string().trim().min(1).max(3000),
  nightPrayerEs: z.string().trim().min(1).max(3000),
  nightPrayerEn: z.string().trim().min(1).max(3000),
  meditationAudioUrlEs: optionalUrl,
  meditationAudioUrlEn: optionalUrl,
  morningAudioUrlEs: optionalUrl,
  morningAudioUrlEn: optionalUrl,
  nightAudioUrlEs: optionalUrl,
  nightAudioUrlEn: optionalUrl,
});
export type DailyContentInput = z.infer<typeof dailyContentInputSchema>;
