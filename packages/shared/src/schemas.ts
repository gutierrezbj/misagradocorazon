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

export const profileUpdateSchema = onboardingSchema
  .omit({ patronSaintId: true })
  .extend({ patronSaintId: z.string().min(1) })
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
