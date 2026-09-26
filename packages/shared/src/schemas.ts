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
