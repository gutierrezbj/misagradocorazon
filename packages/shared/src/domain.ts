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

// Presupuesto de una causa: siempre la suma de sus partidas, nunca un total tecleado aparte.
export function budgetTotalCents(items: readonly { amountCents: number }[]): number {
  return items.reduce((sum, i) => sum + i.amountCents, 0);
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

// Tiempo litúrgico (SDD-05 US-10): las oraciones de mañana y noche cambian según el tiempo.
// Calendario romano general, con granularidad de día:
// - Adviento: del domingo entre el 27-nov y el 3-dic hasta el 24-dic.
// - Navidad: del 25-dic al Bautismo del Señor (domingo después del 6-ene).
// - Cuaresma: del Miércoles de Ceniza al Sábado Santo (el Triduo se sirve como Cuaresma).
// - Pascua: del Domingo de Resurrección a Pentecostés.
// - Tiempo ordinario: el resto.
export const LITURGICAL_SEASONS = ["advent", "christmas", "lent", "easter", "ordinary"] as const;
export type LiturgicalSeason = (typeof LITURGICAL_SEASONS)[number];

const DAY_MS = 86_400_000;
const utc = (y: number, m: number, d: number) => Date.UTC(y, m - 1, d);

// Domingo de Pascua (algoritmo gregoriano anónimo, Meeus/Jones/Butcher). Devuelve ms UTC.
export function easterSunday(year: number): number {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return utc(year, month, day);
}

// Primer domingo de Adviento: el domingo entre el 27-nov y el 3-dic.
function adventStart(year: number): number {
  const nov27 = utc(year, 11, 27);
  return nov27 + ((7 - new Date(nov27).getUTCDay()) % 7) * DAY_MS;
}

// Bautismo del Señor: el domingo siguiente al 6-ene.
function baptismOfTheLord(year: number): number {
  const jan6 = utc(year, 1, 6);
  return jan6 + (7 - new Date(jan6).getUTCDay()) * DAY_MS;
}

// `date` es una fecha local "AAAA-MM-DD" (la del día del fiel).
export function liturgicalSeason(date: string): LiturgicalSeason {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const t = utc(y, m, d);
  if (t <= baptismOfTheLord(y)) return "christmas";
  if (t >= utc(y, 12, 25)) return "christmas";
  if (t >= adventStart(y)) return "advent";
  const easter = easterSunday(y);
  if (t >= easter - 46 * DAY_MS && t < easter) return "lent";
  if (t >= easter && t <= easter + 49 * DAY_MS) return "easter";
  return "ordinary";
}
