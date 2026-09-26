import { isVotingOpen } from "@msc/shared";

import type { Cause } from "../../generated/prisma/client.ts";
import { prisma } from "../../db.ts";
import { monthOf } from "../../lib/dates.ts";

export function causeDto(c: Cause, votes?: number, totalVotes?: number) {
  return {
    id: c.id,
    month: c.month,
    name: { es: c.nameEs, en: c.nameEn },
    location: c.location,
    responsible: c.responsible,
    description: { es: c.descriptionEs, en: c.descriptionEn },
    budgetCents: c.budgetCents,
    photos: c.photos,
    timeline: c.timeline,
    status: c.status,
    ...(votes === undefined ? {} : { votes, percentage: totalVotes ? Math.round((votes / totalVotes) * 100) : 0 }),
  };
}

export async function voteCounts(causeIds: string[]): Promise<Map<string, number>> {
  const rows = await prisma.vote.groupBy({ by: ["causeId"], where: { causeId: { in: causeIds } }, _count: { _all: true } });
  return new Map(rows.map((r) => [r.causeId, r._count._all]));
}

// Día 1 del mes (UTC): las candidatas del mes pasan a votación.
export async function openVoting(month: string) {
  const { count } = await prisma.cause.updateMany({ where: { month, status: "candidate" }, data: { status: "voting" } });
  return { opened: count };
}

// Día 8 del mes (UTC): gana la más votada; en empate, la que se dio de alta antes
// (y, si coinciden al milisegundo, el id menor, para que el resultado sea siempre el mismo). Idempotente.
export async function closeVoting(month: string) {
  const causes = await prisma.cause.findMany({
    where: { month, status: "voting" },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  if (causes.length === 0) return { winnerId: null as string | null };
  const counts = await voteCounts(causes.map((c) => c.id));
  let winner = causes[0]!;
  for (const c of causes) if ((counts.get(c.id) ?? 0) > (counts.get(winner.id) ?? 0)) winner = c;
  await prisma.$transaction([
    prisma.cause.update({ where: { id: winner.id }, data: { status: "won" } }),
    prisma.cause.updateMany({ where: { month, status: "voting", id: { not: winner.id } }, data: { status: "archived" } }),
  ]);
  return { winnerId: winner.id };
}

export function votingState(now = new Date()) {
  return { month: monthOf(now), open: isVotingOpen(now) };
}

// Transparencia (ADR-015): por mes, ingresos, 20 % y transferencias salen del libro de movimientos.
// pendingCents = 20 % del mes aún no transferido a su causa (solo lo ve el panel).
export async function transparencySummary() {
  const rows = await prisma.ledgerEntry.groupBy({ by: ["month", "type"], _sum: { amountCents: true } });
  const winners = await prisma.cause.findMany({ where: { status: { in: ["won", "funded"] } } });
  const byMonth = new Map<string, { revenueCents: number; impactCents: number; transferredCents: number }>();
  for (const r of rows) {
    const m = byMonth.get(r.month) ?? { revenueCents: 0, impactCents: 0, transferredCents: 0 };
    const amount = r._sum.amountCents ?? 0;
    if (r.type === "purchase") m.revenueCents += amount;
    if (r.type === "impact_allocation") m.impactCents += amount;
    if (r.type === "transfer") m.transferredCents += amount;
    byMonth.set(r.month, m);
  }
  const months = [...byMonth.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([month, totals]) => {
      const w = winners.find((c) => c.month === month);
      return {
        month,
        ...totals,
        pendingCents: Math.max(totals.impactCents - totals.transferredCents, 0),
        cause: w ? { id: w.id, name: { es: w.nameEs, en: w.nameEn }, status: w.status } : null,
      };
    });
  const sum = (k: "revenueCents" | "impactCents" | "transferredCents" | "pendingCents") => months.reduce((a, m) => a + m[k], 0);
  return {
    totals: { revenueCents: sum("revenueCents"), impactCents: sum("impactCents"), transferredCents: sum("transferredCents") },
    pendingCents: sum("pendingCents"),
    months,
  };
}
