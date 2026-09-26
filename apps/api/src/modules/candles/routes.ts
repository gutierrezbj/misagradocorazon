import { Router } from "express";
import { CANDLE_TYPES, impactCents, lightCandleSchema, type CandleType } from "@msc/shared";

import { prisma } from "../../db.ts";
import { env } from "../../env.ts";
import { decryptText, encryptText } from "../../lib/crypto.ts";
import { monthOf } from "../../lib/dates.ts";
import { notFound, ok } from "../../http.ts";
import { currentUser, requireUser } from "../../middleware/require-user.ts";
import { payments } from "../payments/provider.ts";

export const candlesRouter = Router();

const HOUR_MS = 3_600_000;

candlesRouter.post("/candles", requireUser, async (req, res) => {
  const user = currentUser(req);
  const input = lightCandleSchema.parse(req.body);
  const type = input.type as CandleType;
  const tier = CANDLE_TYPES[type];

  const saint = await prisma.saint.findFirst({ where: { id: input.saintId, deletedAt: null } });
  if (!saint) throw notFound("Santo");

  const purchase = await payments.confirmPurchase({
    userId: user.id,
    productId: `candle_${type}`,
    amountCents: tier.priceCents,
  });

  const now = new Date();
  const month = monthOf(now);
  // Vela + compra + asignación del 20 % en una sola transacción: o todo o nada.
  const candle = await prisma.$transaction(async (tx) => {
    const created = await tx.candle.create({
      data: {
        userId: user.id,
        saintId: saint.id,
        intentionEncrypted: encryptText(input.intention, env.INTENTIONS_KEY),
        type,
        category: input.category,
        priceCents: tier.priceCents,
        paymentProvider: payments.name,
        paymentRef: purchase.ref,
        litAt: now,
        expiresAt: new Date(now.getTime() + tier.durationHours * HOUR_MS),
      },
    });
    await tx.ledgerEntry.createMany({
      data: [
        { type: "purchase", amountCents: tier.priceCents, month, candleId: created.id },
        { type: "impact_allocation", amountCents: impactCents(tier.priceCents), month, candleId: created.id },
      ],
    });
    return created;
  });

  ok(
    res,
    {
      id: candle.id,
      saintId: candle.saintId,
      saint: { id: saint.id, name: saint.name, imageUrl: saint.imageUrl },
      intention: input.intention,
      type: candle.type,
      category: candle.category,
      litAt: candle.litAt,
      expiresAt: candle.expiresAt,
    },
    201,
  );
});

candlesRouter.get("/candles/me", requireUser, async (req, res) => {
  const user = currentUser(req);
  const candles = await prisma.candle.findMany({
    where: { userId: user.id },
    orderBy: { litAt: "desc" },
    take: 200,
    include: { saint: { select: { id: true, name: true, imageUrl: true } } },
  });
  const now = Date.now();
  ok(
    res,
    candles.map((c) => ({
      id: c.id,
      saintId: c.saintId,
      saint: c.saint,
      intention: decryptText(c.intentionEncrypted, env.INTENTIONS_KEY),
      type: c.type,
      category: c.category,
      priceCents: c.priceCents,
      litAt: c.litAt,
      expiresAt: c.expiresAt,
      active: c.expiresAt.getTime() > now,
    })),
  );
});

// Muro de velas: solo llamas y contadores. Ni intenciones ni datos de usuarios.
candlesRouter.get("/candles/community", async (_req, res) => {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * HOUR_MS);
  const dayAgo = new Date(now.getTime() - 24 * HOUR_MS);
  const [active, last24h, last7d, flames] = await Promise.all([
    prisma.candle.count({ where: { expiresAt: { gt: now } } }),
    prisma.candle.count({ where: { litAt: { gt: dayAgo } } }),
    prisma.candle.count({ where: { litAt: { gt: weekAgo } } }),
    prisma.candle.findMany({
      where: { expiresAt: { gt: now } },
      orderBy: { litAt: "desc" },
      take: 60,
      select: { saintId: true, type: true, category: true, litAt: true },
    }),
  ]);
  ok(res, { active, last24h, last7d, flames });
});
