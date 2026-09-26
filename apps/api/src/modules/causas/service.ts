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
