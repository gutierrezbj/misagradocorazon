// KPIs del panel (SDD-02: MAU, retención D7/D30, conversión a vela, velas, ingresos, 20 %,
// participación en votación, asistencia a misa). Consultas en vivo sobre PostgreSQL:
// a la escala del MVP bastan. Cuando crezca, un job nocturno de pg-boss los guardará en agregados diarios.
import { prisma } from "../../db.ts";
import { monthOf } from "../../lib/dates.ts";

// Actividad = cualquier gesto devocional o comunitario de un fiel (el staff no cuenta).
const ACTIVITY_SQL = `
  SELECT ev."userId", ev.at FROM (
    SELECT "userId", "createdAt" AS at FROM prayer_log
    UNION ALL SELECT "userId", "litAt" FROM candle
    UNION ALL SELECT "userId", "createdAt" FROM intention
    UNION ALL SELECT "userId", "createdAt" FROM intention_prayer
    UNION ALL SELECT "userId", "createdAt" FROM chat_message
    UNION ALL SELECT "userId", "createdAt" FROM vote
  ) ev JOIN "user" u ON u.id = ev."userId" AND u.role = 'user'
`;

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
       FROM "user" WHERE role = 'user'`,
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
          WHERE role = 'user' AND "createdAt" <= $1 AND "createdAt" > $2
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

  const candlesByDay = await prisma.$queryRawUnsafe<{ day: string; candles: bigint }[]>(
    `SELECT to_char(d::date, 'YYYY-MM-DD') AS day, count(c.id) AS candles
       FROM generate_series(date_trunc('day', $1::timestamptz), date_trunc('day', $2::timestamptz), interval '1 day') d
       LEFT JOIN candle c ON date_trunc('day', c."litAt") = d
      GROUP BY d ORDER BY d`,
    since,
    now,
  );

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

  // Asistencia a misa: personas distintas que escribieron en el chat de la última misa celebrada.
  // Es un mínimo (quien solo mira no deja rastro); la asistencia real llegará con PostHog.
  const lastMass = await prisma.mass.findFirst({ where: { scheduledAt: { lte: now } }, orderBy: { scheduledAt: "desc" } });
  const massParticipants = lastMass
    ? (await prisma.chatMessage.findMany({ where: { massId: lastMass.id }, distinct: ["userId"], select: { userId: true } })).length
    : 0;

  const pendingModeration =
    (await prisma.intention.count({ where: { status: "pending" } })) +
    (await prisma.chatMessage.count({ where: { status: "pending" } }));

  const mau = n(active?.mau);
  return {
    generatedAt: now,
    windowDays: days,
    users: { total: n(users?.total), new: n(users?.new_users), onboarded: n(users?.onboarded) },
    active: { dau: n(active?.dau), wau: n(active?.wau), mau },
    retention: { d7: await retention(7), d30: await retention(30) },
    candles: {
      total: n(candleTotals?.candles),
      buyers: n(candleTotals?.buyers),
      conversionRate: pct(n(candleTotals?.buyers), mau),
      byDay: candlesByDay.map((d) => ({ day: d.day, candles: n(d.candles) })),
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
    mass: lastMass ? { massId: lastMass.id, scheduledAt: lastMass.scheduledAt, chatParticipants: massParticipants } : null,
    moderation: { pending: pendingModeration },
  };
}
