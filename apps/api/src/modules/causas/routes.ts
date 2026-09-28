import { Router } from "express";

import { prisma } from "../../db.ts";
import { HttpError, notFound, ok, pathParam } from "../../http.ts";
import { optionalUser } from "../../middleware/roles.ts";
import { currentUser, requireUser } from "../../middleware/require-user.ts";
import { causeDto, transparencySummary, voteCounts, votingState, withBudget } from "./service.ts";

export const causasRouter = Router();

causasRouter.get("/causes/current", optionalUser, async (req, res) => {
  const { month, open } = votingState();
  const causes = await prisma.cause.findMany({
    where: { month, status: { in: ["voting", "won"] } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    include: withBudget,
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

causasRouter.get("/votes/me", requireUser, async (req, res) => {
  const user = currentUser(req);
  const votes = await prisma.vote.findMany({
    where: { userId: user.id },
    orderBy: { month: "desc" },
    include: { cause: { select: { id: true, nameEs: true, nameEn: true, status: true } } },
  });
  ok(
    res,
    votes.map((v) => ({
      month: v.month,
      cause: { id: v.cause.id, name: { es: v.cause.nameEs, en: v.cause.nameEn }, status: v.cause.status },
      createdAt: v.createdAt,
    })),
  );
});

causasRouter.get("/causes/history", async (_req, res) => {
  const causes = await prisma.cause.findMany({
    where: { status: { in: ["won", "funded"] } },
    orderBy: { month: "desc" },
    include: { ...withBudget, updates: { orderBy: { createdAt: "asc" } } },
  });
  ok(
    res,
    causes.map((c) => ({
      ...causeDto(c),
      updates: c.updates.map((u) => ({ id: u.id, text: { es: u.textEs, en: u.textEn }, photoUrl: u.photoUrl, createdAt: u.createdAt })),
    })),
  );
});

// Ficha completa de una causa publicada (SDD-02 Pilar 3). Las candidatas aún no son públicas.
causasRouter.get("/causes/:id", async (req, res) => {
  const cause = await prisma.cause.findFirst({
    where: { id: pathParam(req, "id"), status: { not: "candidate" } },
    include: { ...withBudget, updates: { orderBy: { createdAt: "asc" } } },
  });
  if (!cause) throw notFound("Causa");
  ok(res, {
    ...causeDto(cause),
    updates: cause.updates.map((u) => ({ id: u.id, text: { es: u.textEs, en: u.textEn }, photoUrl: u.photoUrl, createdAt: u.createdAt })),
  });
});

// Transparencia: todo sale del libro de movimientos. Nada se teclea a mano.
causasRouter.get("/transparency", async (_req, res) => {
  const { totals, months } = await transparencySummary();
  ok(res, {
    totals,
    months: months.map(({ pendingCents: _pendingCents, ...m }) => m),
  });
});
