// Constantes de dominio compartidas por app, panel y API.
// Fuente: SDD-02 y SDD-03 (Notion, 26-sep-2026).

export const ROLES = ["user", "moderator", "editor", "superadmin"] as const;
export type Role = (typeof ROLES)[number];

export const STAFF_ROLES = ["moderator", "editor", "superadmin"] as const satisfies readonly Role[];

export const LOCALES = ["es", "en"] as const;
export type Locale = (typeof LOCALES)[number];

// Precios en céntimos de USD para no operar con coma flotante.
// Tiers de las stores: 0,99 / 1,99 / 2,99 USD.
export const CANDLE_TYPES = {
  basic: { priceCents: 99, durationHours: 24 },
  solemn: { priceCents: 199, durationHours: 72 },
  // Sin renovación automática (decisión del fundador, 27-sep-2026): al apagarse, aviso opcional.
  permanent: { priceCents: 299, durationHours: 24 * 7 },
} as const;
export type CandleType = keyof typeof CANDLE_TYPES;
export const CANDLE_TYPE_KEYS = Object.keys(CANDLE_TYPES) as CandleType[];

export const CANDLE_CATEGORIES = ["general", "difuntos"] as const;
export type CandleCategory = (typeof CANDLE_CATEGORIES)[number];

export const INTENTION_CATEGORIES = ["salud", "familia", "trabajo", "difuntos", "agradecimiento", "general"] as const;
export type IntentionCategory = (typeof INTENTION_CATEGORIES)[number];

export const CAUSE_STATUSES = ["candidate", "voting", "won", "funded", "archived"] as const;
export type CauseStatus = (typeof CAUSE_STATUSES)[number];

// Regla fundacional: 20 % de la facturación mensual a la causa votada.
export const IMPACT_SHARE_BASIS_POINTS = 2000;

// Periodo de votación: días 1 a 7 del mes (inclusive); anuncio el día 8.
export const VOTING_WINDOW = { firstDay: 1, lastDay: 7, announceDay: 8 } as const;

export function impactCents(amountCents: number): number {
  return Math.round((amountCents * IMPACT_SHARE_BASIS_POINTS) / 10_000);
}

export function isVotingOpen(date: Date): boolean {
  const day = date.getUTCDate();
  return day >= VOTING_WINDOW.firstDay && day <= VOTING_WINDOW.lastDay;
}

// Métricas de éxito del MVP (especificación funcional §10): objetivo a los meses 1-3 y al mes 6.
// Todas son mensuales; el panel las compara con los últimos 30 días. Dinero en céntimos de USD.
export const MVP_TARGETS = {
  downloads: { m3: 5_000, m6: 25_000 },
  mau: { m3: 2_000, m6: 10_000 },
  candleConversionPct: { m3: 10, m6: 15 },
  candlesPerMonth: { m3: 400, m6: 3_000 },
  retentionD7Pct: { m3: 30, m6: 40 },
  retentionD30Pct: { m3: 15, m6: 25 },
  massAttendance: { m3: 200, m6: 1_000 },
  votingParticipationPct: { m3: 50, m6: 60 },
  revenueCentsPerMonth: { m3: 200_000, m6: 1_500_000 },
  impactTransferredCentsPerMonth: { m3: 40_000, m6: 300_000 },
} as const;
export type MvpGoalKey = keyof typeof MVP_TARGETS;
