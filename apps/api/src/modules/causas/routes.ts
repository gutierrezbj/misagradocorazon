import { Router } from "express";

import { prisma } from "../../db.ts";
import { HttpError, notFound, ok, pathParam } from "../../http.ts";
import { optionalUser } from "../../middleware/roles.ts";
import { currentUser, requireUser } from "../../middleware/require-user.ts";
import { causeDto, voteCounts, votingState } from "./service.ts";

export const causasRouter = Router();

causasRouter.get("/causes/current", optionalUser, async (req, res) => {
  const { month, open } = votingState();
  const causes = await prisma.cause.findMany({
    where: { month, status: { in: ["voting", "won"] } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  const counts = await voteCounts(causes.map((c) => c.id));
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  const myVote = req.user ? await prisma.vote.findUnique({ where: { userId_month: { userId: req.user.id, month } } }) : null;
  ok(res, {
    month,
    votingOpen: open && causes.some((c) => c.status === "voting"),
    totalVotes: total,
    myVoteCauseId: myVote?.causeId ?? null,
    causes: causes.map((c) => causeDto(c, counts.get(c.id) ?? 0, total)),
  });
});

causasRouter.post("/causes/:id/vote", requireUser, async (req, res) => {
  const user = currentUser(req);
  const { month, open } = votingState();
  const cause = await prisma.cause.findUnique({ where: { id: pathParam(req, "id") } });
  if (!cause) throw notFound("Causa");
  if (!open || cause.status !== "voting" || cause.month !== month) {
    throw new HttpError(409, "voting_closed", "La votación de esta causa no está abierta");
  }
  try {
    await prisma.vote.create({ data: { userId: user.id, month, causeId: cause.id } });
  } catch (err) {
    // P2002: violación de la clave (usuario, mes) → ya votó este mes, también en carreras simultáneas.
    if ((err as { code?: string }).code === "P2002") throw new HttpError(409, "already_voted", "Ya has votado este mes");
    throw err;
  }
  ok(res, { voted: true, causeId: cause.id }, 201);
});

causasRouter.get("/causes/history", async (_req, res) => {
  const causes = await prisma.cause.findMany({
    where: { status: { in: ["won", "funded"] } },
    orderBy: { month: "desc" },
    include: { updates: { orderBy: { createdAt: "asc" } } },
  });
  ok(
    res,
    causes.map((c) => ({
      ...causeDto(c),
      updates: c.updates.map((u) => ({ id: u.id, text: { es: u.textEs, en: u.textEn }, photoUrl: u.photoUrl, createdAt: u.createdAt })),
    })),
  );
});

// Transparencia: todo sale del libro de movimientos. Nada se teclea a mano.
causasRouter.get("/transparency", async (_req, res) => {
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
      return { month, ...totals, cause: w ? { id: w.id, name: { es: w.nameEs, en: w.nameEn }, status: w.status } : null };
    });
  const sum = (k: "revenueCents" | "impactCents" | "transferredCents") => months.reduce((a, m) => a + m[k], 0);
  ok(res, {
    totals: { revenueCents: sum("revenueCents"), impactCents: sum("impactCents"), transferredCents: sum("transferredCents") },
    months,
  });
});
