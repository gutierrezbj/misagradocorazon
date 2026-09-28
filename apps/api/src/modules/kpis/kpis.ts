// KPIs del panel (SDD-02: MAU, retención D7/D30, conversión a vela, velas, ingresos, 20 %,
// participación en votación, asistencia a misa). Las cifras de la ventana se consultan en vivo;
// la serie por día sale de los agregados diarios (kpi_daily) más el día de hoy en vivo.
import { LITURGICAL_SEASONS, liturgicalSeason, MVP_TARGETS, type MvpGoalKey } from "@msc/shared";

import { prisma } from "../../db.ts";
import { monthOf } from "../../lib/dates.ts";
import { ACTIVITY_SQL, dailySeries, isoDay } from "./kpi-daily.ts";

const n = (v: unknown) => Number(v ?? 0);
const pct = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 1000) / 10 : null);

export async function computeKpis(days: number, now = new Date()) {
  const since = new Date(now.getTime() - days * 86_400_000);
  const since30 = new Date(now.getTime() - 30 * 86_400_000);
  const month = monthOf(now);

  const [users] = await prisma.$queryRawUnsafe<{ total: bigint; new_users: bigint; onboarded: bigint }[]>(
    `SELECT count(*) AS total,
            count(*) FILTER (WHERE "createdAt" >= $1) AS new_users,
            count(*) FILTER (WHERE onboarded) AS onboarded
       FROM "user" WHERE role = 'user' AND "deletedAt" IS NULL`,
    since,
  );

  const [active] = await prisma.$queryRawUnsafe<{ mau: bigint; wau: bigint; dau: bigint }[]>(
    `SELECT count(DISTINCT "userId") FILTER (WHERE at >= $1) AS mau,
            count(DISTINCT "userId") FILTER (WHERE at >= $2) AS wau,
            count(DISTINCT "userId") FILTER (WHERE at >= $3) AS dau
       FROM (${ACTIVITY_SQL}) a`,
    since30,
    new Date(now.getTime() - 7 * 86_400_000),
    new Date(now.getTime() - 86_400_000),
  );

  // Retención DN: de los que se registraron hace entre N y N+30 días,
  // % con alguna actividad entre el día N y el N+7 desde su alta.
  const retention = async (dayN: number) => {
    const [r] = await prisma.$queryRawUnsafe<{ cohort: bigint; retained: bigint }[]>(
      `WITH cohort AS (
         SELECT id, "createdAt" FROM "user"
          WHERE role = 'user' AND "deletedAt" IS NULL AND "createdAt" <= $1 AND "createdAt" > $2
       )
       SELECT count(*) AS cohort,
              count(*) FILTER (WHERE EXISTS (
                SELECT 1 FROM (${ACTIVITY_SQL}) a
                 WHERE a."userId" = cohort.id
                   AND a.at >= cohort."createdAt" + ($3 || ' days')::interval
                   AND a.at <  cohort."createdAt" + ($4 || ' days')::interval
              )) AS retained
         FROM cohort`,
      new Date(now.getTime() - dayN * 86_400_000),
      new Date(now.getTime() - (dayN + 30) * 86_400_000),
      String(dayN),
      String(dayN + 7),
    );
    return { cohort: n(r?.cohort), rate: pct(n(r?.retained), n(r?.cohort)) };
  };

  const [candleTotals] = await prisma.$queryRawUnsafe<{ candles: bigint; buyers: bigint }[]>(
    `SELECT count(*) AS candles, count(DISTINCT "userId") AS buyers FROM candle WHERE "litAt" >= $1`,
    since,
  );

  const daily = await dailySeries(isoDay(since), now);

  const byType = await prisma.candle.groupBy({ by: ["type"], where: { litAt: { gte: since } }, _count: { _all: true } });
  const bySaintRaw = await prisma.candle.groupBy({
    by: ["saintId"],
    where: { litAt: { gte: since } },
    _count: { _all: true },
    orderBy: { _count: { saintId: "desc" } },
    take: 8,
  });
  const saints = await prisma.saint.findMany({ where: { id: { in: bySaintRaw.map((s) => s.saintId) } }, select: { id: true, name: true } });

  const money = await prisma.ledgerEntry.groupBy({
    by: ["type"],
    where: { createdAt: { gte: since } },
    _sum: { amountCents: true },
  });
  const sumOf = (t: string) => n(money.find((m) => m.type === t)?._sum.amountCents);

  const votesThisMonth = await prisma.vote.count({ where: { month } });

  // Asistencia a la última misa empezada: fieles que la tuvieron abierta en directo, y cuántos escribieron.
  const lastMass = await prisma.mass.findFirst({ where: { scheduledAt: { lte: now } }, orderBy: { scheduledAt: "desc" } });
  const faithful = { role: "user" as const };
  const [massAttendees, massParticipants] = lastMass
    ? await Promise.all([
        prisma.massAttendance.count({ where: { massId: lastMass.id, user: faithful } }),
        prisma.chatMessage.findMany({ where: { massId: lastMass.id, user: faithful }, distinct: ["userId"], select: { userId: true } }).then((r) => r.length),
      ])
    : [0, 0];

  // Oraciones rezadas por tiempo litúrgico (US-10): media por día de cada tiempo dentro de la ventana,
  // para comparar tiempos de distinta duración. El día es el local del fiel (prayer_log.localDate).
  const prayerDays = await prisma.$queryRawUnsafe<{ day: string; prayers: bigint }[]>(
    `SELECT p."localDate" AS day, count(*) AS prayers
       FROM prayer_log p JOIN "user" u ON u.id = p."userId" AND u.role = 'user'
      WHERE p."localDate" >= $1 GROUP BY 1`,
    isoDay(since),
  );
  const seasonDays = new Map<string, number>();
  for (let t = Date.parse(`${isoDay(since)}T00:00:00Z`); t <= now.getTime(); t += 86_400_000) {
    const s = liturgicalSeason(new Date(t).toISOString().slice(0, 10));
    seasonDays.set(s, (seasonDays.get(s) ?? 0) + 1);
  }
  const prayersBySeason = LITURGICAL_SEASONS.filter((s) => seasonDays.has(s)).map((season) => {
    const prayers = prayerDays.filter((d) => liturgicalSeason(d.day) === season).reduce((a, d) => a + n(d.prayers), 0);
    const days = seasonDays.get(season)!;
    return { season, days, prayers, perDay: Math.round((prayers / days) * 10) / 10 };
  });

  const pendingModeration =
    (await prisma.intention.count({ where: { status: "pending" } })) + (await prisma.chatMessage.count({ where: { status: "pending" } }));

  const mau = n(active?.mau);
  const retentionD7 = await retention(7);
  const retentionD30 = await retention(30);

  // Objetivos del MVP (especificación §10): son mensuales, así que se miden siempre sobre los últimos
  // 30 días, sea cual sea la ventana elegida en el panel.
  const [month30] = await prisma.$queryRawUnsafe<{ candles: bigint; buyers: bigint }[]>(
    `SELECT count(*) AS candles, count(DISTINCT c."userId") FILTER (WHERE u.role = 'user') AS buyers
       FROM candle c JOIN "user" u ON u.id = c."userId" WHERE c."litAt" >= $1`,
    since30,
  );
  const money30 = await prisma.ledgerEntry.groupBy({ by: ["type"], where: { createdAt: { gte: since30 } }, _sum: { amountCents: true } });
  const sum30 = (t: string) => n(money30.find((m) => m.type === t)?._sum.amountCents);
  const goal = (key: MvpGoalKey, value: number | null, unit: "count" | "pct" | "usdCents") => ({ key, value, unit, target: MVP_TARGETS[key] });
  const goals = [
    // Las descargas no están en la base de datos: se leen en App Store Connect y Google Play Console.
    goal("downloads", null, "count"),
    goal("mau", mau, "count"),
    goal("candleConversionPct", pct(n(month30?.buyers), mau), "pct"),
    goal("candlesPerMonth", n(month30?.candles), "count"),
    goal("retentionD7Pct", retentionD7.rate, "pct"),
    goal("retentionD30Pct", retentionD30.rate, "pct"),
    goal("massAttendance", lastMass ? massAttendees : null, "count"),
    goal("votingParticipationPct", pct(votesThisMonth, mau), "pct"),
    goal("revenueCentsPerMonth", sum30("purchase"), "usdCents"),
    goal("impactTransferredCentsPerMonth", sum30("transfer"), "usdCents"),
  ];

  return {
    generatedAt: now,
    windowDays: days,
    users: { total: n(users?.total), new: n(users?.new_users), onboarded: n(users?.onboarded) },
    active: { dau: n(active?.dau), wau: n(active?.wau), mau },
    retention: { d7: retentionD7, d30: retentionD30 },
    candles: {
      total: n(candleTotals?.candles),
      buyers: n(candleTotals?.buyers),
      conversionRate: pct(n(candleTotals?.buyers), mau),
      byDay: daily.map((d) => ({ day: d.day, candles: d.candles })),
      byType: ["basic", "solemn", "permanent"].map((t) => ({ type: t, candles: byType.find((b) => b.type === t)?._count._all ?? 0 })),
      bySaint: bySaintRaw.map((s) => ({
        saintId: s.saintId,
        name: saints.find((x) => x.id === s.saintId)?.name ?? s.saintId,
        candles: s._count._all,
      })),
    },
    money: {
      // En el MVP los pagos son simulados: estas cifras no son dinero real.
      simulated: true,
      revenueCents: sumOf("purchase"),
      impactCents: sumOf("impact_allocation"),
      transferredCents: sumOf("transfer"),
    },
    voting: { month, votes: votesThisMonth, participationRate: pct(votesThisMonth, mau) },
    mass: lastMass ? { massId: lastMass.id, scheduledAt: lastMass.scheduledAt, attendees: massAttendees, chatParticipants: massParticipants } : null,
    daily: daily.map((d) => ({ day: d.day, newUsers: d.newUsers, activeUsers: d.activeUsers, candles: d.candles, revenueCents: d.revenueCents })),
    moderation: { pending: pendingModeration },
    prayers: { current: liturgicalSeason(isoDay(now)), bySeason: prayersBySeason },
    goals,
  };
}
