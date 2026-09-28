// Esquemas de validación: única definición de los contratos de la API (SDD-06).
import { z } from "zod";

import { CANDLE_CATEGORIES, CANDLE_TYPE_KEYS, INTENTION_CATEGORIES, LITURGICAL_SEASONS, LOCALES, ROLES } from "./domain.ts";

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Formato HH:MM");

// Esquema de edición (PATCH) a partir del de alta: todo opcional y sin valores por defecto.
// En Zod 4, .partial() conserva los .default(): un PATCH con un solo campo rellenaría los demás
// con su valor por defecto y pisaría lo guardado.
type Editable<S extends z.ZodRawShape> = { [K in keyof S]: z.ZodOptional<S[K] extends z.ZodDefault<infer I> ? I : S[K]> };
export function updateSchemaOf<S extends z.ZodRawShape>(schema: z.ZodObject<S>): z.ZodObject<Editable<S>> {
  const shape = Object.fromEntries(
    Object.entries(schema.shape).map(([k, v]) => [k, z.optional(v instanceof z.ZodDefault ? (v.unwrap() as z.ZodType) : v)]),
  );
  return z.object(shape) as unknown as z.ZodObject<Editable<S>>;
}

export const roleSchema = z.enum(ROLES);
export const localeSchema = z.enum(LOCALES);

// Campos del perfil devocional, sin valores por defecto. Los defectos solo valen en el alta
// (onboarding): en PATCH /me un campo que no llega no se toca.
const profileFields = {
  patronSaintId: z.string().min(1),
  secondarySaintIds: z.array(z.string().min(1)).max(10),
  morningTime: hhmm,
  angelusTime: hhmm,
  nightTime: hhmm,
  language: localeSchema,
  // Zona horaria IANA del dispositivo (p. ej. "America/Los_Angeles"); define el "hoy" del fiel.
  timezone: z.string().min(1).max(64),
  // Consentimiento explícito para la analítica de uso (ADR-011). Sin él no se envía nada.
  analyticsConsent: z.boolean(),
};

export const onboardingSchema = z.object({
  ...profileFields,
  secondarySaintIds: profileFields.secondarySaintIds.default([]),
  morningTime: hhmm.default("07:30"),
  angelusTime: hhmm.default("12:00"),
  nightTime: hhmm.default("21:30"),
  language: localeSchema.default("es"),
  timezone: profileFields.timezone.optional(),
  analyticsConsent: profileFields.analyticsConsent.optional(),
});
export type OnboardingInput = z.infer<typeof onboardingSchema>;

export const notificationPrefsSchema = z.object({
  notifyMorning: z.boolean(),
  notifyNight: z.boolean(),
  notifySaint: z.boolean(),
  notifyCommunity: z.boolean(),
  // Aviso al apagarse la vela permanente. Invita a volver a encenderla: solo con consentimiento
  // explícito (Apple 4.5.4), por eso empieza desactivado.
  notifyCandleExpiry: z.boolean(),
});
export type NotificationPrefs = z.infer<typeof notificationPrefsSchema>;

export const profileUpdateSchema = z.object({ ...profileFields, ...notificationPrefsSchema.shape }).partial();
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

// Ficha pública de la causa (SDD-02 Pilar 3; especificación §2.3): presupuesto desglosado y
// descripción exacta de qué se hará con el dinero. El total no se teclea: es la suma de las partidas.
export const budgetItemSchema = z.object({
  conceptEs: z.string().trim().min(1).max(160),
  conceptEn: z.string().trim().min(1).max(160),
  amountCents: z.number().int().positive(),
});
export type BudgetItem = z.infer<typeof budgetItemSchema>;

export const causeInputSchema = z.object({
  month: yearMonth,
  nameEs: z.string().trim().min(1).max(120),
  nameEn: z.string().trim().min(1).max(120),
  location: z.string().trim().min(1).max(120),
  responsible: z.string().trim().min(1).max(120),
  descriptionEs: z.string().trim().min(1).max(4000),
  descriptionEn: z.string().trim().min(1).max(4000),
  fundsUseEs: z.string().trim().min(1).max(2000),
  fundsUseEn: z.string().trim().min(1).max(2000),
  budgetItems: z.array(budgetItemSchema).min(1).max(20),
  photos: z.array(z.url()).max(12).default([]),
  timeline: z.string().trim().min(1).max(120),
});
export type CauseInput = z.infer<typeof causeInputSchema>;
export const causeUpdateSchema = updateSchemaOf(causeInputSchema);

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
// Al editar, la grabación también se puede quitar (null).
export const massUpdateSchema = updateSchemaOf(massInputSchema).extend({ recordingUrl: z.url().nullable().optional() });

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
export const saintUpdateSchema = updateSchemaOf(saintInputSchema);

// Oración del día opcional (US-10): vacía en los dos idiomas = se sirve la del tiempo litúrgico.
const optionalPrayer = z
  .string()
  .trim()
  .max(3000)
  .nullable()
  .optional()
  .transform((s) => s || null);

export const dailyContentInputSchema = z
  .object({
    saintOfDayId: z.string().min(1).nullable().optional(),
    gospelRef: z.string().trim().min(1).max(120),
    gospelEs: z.string().trim().min(1).max(8000),
    gospelEn: z.string().trim().min(1).max(8000),
    meditationEs: z.string().trim().min(1).max(8000),
    meditationEn: z.string().trim().min(1).max(8000),
    morningPrayerEs: optionalPrayer,
    morningPrayerEn: optionalPrayer,
    nightPrayerEs: optionalPrayer,
    nightPrayerEn: optionalPrayer,
    meditationAudioUrlEs: optionalUrl,
    meditationAudioUrlEn: optionalUrl,
    morningAudioUrlEs: optionalUrl,
    morningAudioUrlEn: optionalUrl,
    nightAudioUrlEs: optionalUrl,
    nightAudioUrlEn: optionalUrl,
  })
  // Una oración propia del día va en los dos idiomas o en ninguno: nunca medio día propio y medio
  // del tiempo. Sin texto propio no hay audio propio (se sirve el del tiempo, no se ignora en silencio).
  .superRefine((d, ctx) => {
    for (const [kind, audio] of [["morningPrayer", "morningAudioUrl"], ["nightPrayer", "nightAudioUrl"]] as const) {
      if (!d[`${kind}Es`] !== !d[`${kind}En`]) {
        ctx.addIssue({ code: "custom", path: [d[`${kind}Es`] ? `${kind}En` : `${kind}Es`], message: "Falta el otro idioma" });
      }
      if (!d[`${kind}Es`] && (d[`${audio}Es`] || d[`${audio}En`])) {
        ctx.addIssue({ code: "custom", path: [kind + "Es"], message: "Audio sin texto propio del día" });
      }
    }
  });
export type DailyContentInput = z.infer<typeof dailyContentInputSchema>;

// Oraciones de mañana y noche de un tiempo litúrgico (US-10). El audio lo graba el equipo.
export const seasonalPrayerKeySchema = z.object({ season: z.enum(LITURGICAL_SEASONS), kind: prayerCompleteSchema.shape.kind });
export const seasonalPrayerInputSchema = z.object({
  textEs: z.string().trim().min(1).max(3000),
  textEn: z.string().trim().min(1).max(3000),
  audioUrlEs: optionalUrl,
  audioUrlEn: optionalUrl,
});
export type SeasonalPrayerInput = z.infer<typeof seasonalPrayerInputSchema>;

// Borrado de cuenta (SDD-02, transversal): confirmación explícita desde la app.
export const accountDeleteSchema = z.object({ confirm: z.literal(true) });

// Código de autorización de Sign in with Apple, para poder revocar al borrar la cuenta.
export const appleAuthorizationSchema = z.object({ code: z.string().min(1).max(2000) });
