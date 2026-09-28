// Agregados diarios de negocio (SDD-05 US-20: series temporales en kpi_daily).
// Día natural en UTC. El worker recalcula cada noche los últimos días (por si llegan escrituras
// tardías) y rellena los huecos; el panel también rellena los que falten al consultar.
// Hoy no se guarda: está a medias y se calcula en vivo.
import type { KpiDaily } from "../../generated/prisma/client.ts";
import { prisma } from "../../db.ts";

// Actividad = cualquier gesto devocional o comunitario de un fiel (el staff no cuenta).
export const ACTIVITY_SQL = `
  SELECT ev."userId", ev.at FROM (
    SELECT "userId", "createdAt" AS at FROM prayer_log
    UNION ALL SELECT "userId", "litAt" FROM candle
    UNION ALL SELECT "userId", "createdAt" FROM intention
    UNION ALL SELECT "userId", "createdAt" FROM intention_prayer
    UNION ALL SELECT "userId", "createdAt" FROM chat_message
    UNION ALL SELECT "userId", "createdAt" FROM vote
    UNION ALL SELECT "userId", "firstSeenAt" FROM mass_attendance
  ) ev JOIN "user" u ON u.id = ev."userId" AND u.role = 'user'
`;

const RECOMPUTE_DAYS = 3;
const MAX_BACKFILL_DAYS = 400;

export type DayKpis = Omit<KpiDaily, "computedAt">;

export const isoDay = (d: Date) => d.toISOString().slice(0, 10);

export function addDays(day: string, n: number) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return isoDay(d);
}

export async function computeDay(day: string): Promise<DayKpis> {
  const start = new Date(`${day}T00:00:00Z`);
  const end = new Date(`${addDays(day, 1)}T00:00:00Z`);
  const range = (col: string) => `${col} >= $1 AND ${col} < $2`;
  const [r] = await prisma.$queryRawUnsafe<Record<string, bigint>[]>(
    `SELECT
       (SELECT count(*) FROM "user" WHERE role = 'user' AND ${range('"createdAt"')}) AS new_users,
       (SELECT count(DISTINCT "userId") FROM (${ACTIVITY_SQL}) a WHERE ${range("a.at")}) AS active_users,
       (SELECT count(*) FROM prayer_log p JOIN "user" u ON u.id = p."userId" AND u.role = 'user' WHERE ${range('p."createdAt"')}) AS prayers,
       (SELECT count(*) FROM candle WHERE ${range('"litAt"')}) AS candles,
       (SELECT count(DISTINCT "userId") FROM candle WHERE ${range('"litAt"')}) AS buyers,
       (SELECT coalesce(sum("amountCents"), 0) FROM ledger_entry WHERE type = 'purchase' AND ${range('"createdAt"')}) AS revenue,
       (SELECT coalesce(sum("amountCents"), 0) FROM ledger_entry WHERE type = 'impact_allocation' AND ${range('"createdAt"')}) AS impact,
       (SELECT count(*) FROM vote WHERE ${range('"createdAt"')}) AS votes,
       (SELECT count(*) FROM chat_message WHERE ${range('"createdAt"')}) AS chat_messages,
       (SELECT count(DISTINCT m."userId") FROM mass_attendance m JOIN "user" u ON u.id = m."userId" AND u.role = 'user'
         WHERE ${range('m."firstSeenAt"')}) AS mass_attendees`,
    start,
    end,
  );
  const n = (k: string) => Number(r?.[k] ?? 0);
  return {
    day,
    newUsers: n("new_users"),
    activeUsers: n("active_users"),
    prayers: n("prayers"),
    candles: n("candles"),
    buyers: n("buyers"),
    revenueCents: n("revenue"),
    impactCents: n("impact"),
    votes: n("votes"),
    chatMessages: n("chat_messages"),
    massAttendees: n("mass_attendees"),
  };
}

async function store(day: string) {
  const data = await computeDay(day);
  await prisma.kpiDaily.upsert({ where: { day }, create: data, update: data });
}

// Días cerrados (anteriores a hoy) que faltan entre from y ayer, ambos incluidos.
async function missingDays(from: string, yesterday: string) {
  if (from > yesterday) return [];
  const have = new Set((await prisma.kpiDaily.findMany({ where: { day: { gte: from, lte: yesterday } }, select: { day: true } })).map((r) => r.day));
  const out: string[] = [];
  for (let d = from; d <= yesterday; d = addDays(d, 1)) if (!have.has(d)) out.push(d);
  return out;
}

// Job nocturno: recalcula los últimos días y rellena huecos desde el primer registro.
export async function refreshKpiDaily(now = new Date()) {
  const yesterday = addDays(isoDay(now), -1);
  const floor = addDays(yesterday, -(MAX_BACKFILL_DAYS - 1));
  const firstUser = await prisma.user.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } });
  const from = firstUser && isoDay(firstUser.createdAt) > floor ? isoDay(firstUser.createdAt) : floor;
  const recompute = new Set<string>();
  for (let i = 0; i < RECOMPUTE_DAYS; i++) {
    const d = addDays(yesterday, -i);
    if (d >= from) recompute.add(d);
  }
  const days = [...new Set([...(await missingDays(from, yesterday)), ...recompute])].sort();
  for (const d of days) await store(d);
  return { days: days.length };
}

// Serie para el panel: días cerrados desde kpi_daily (rellenando huecos) y hoy en vivo.
export async function dailySeries(fromDay: string, now = new Date()) {
  const today = isoDay(now);
  const yesterday = addDays(today, -1);
  for (const d of await missingDays(fromDay, yesterday)) await store(d);
  const stored = await prisma.kpiDaily.findMany({ where: { day: { gte: fromDay, lte: yesterday } }, orderBy: { day: "asc" } });
  const strip = ({ computedAt: _computedAt, ...rest }: KpiDaily): DayKpis => rest;
  return [...stored.map(strip), await computeDay(today)];
}
