import { Router } from "express";
import { INTENTION_CATEGORIES, intentionSchema, privateIntentionSchema } from "@msc/shared";
import { z } from "zod";

import { prisma } from "../../db.ts";
import { env } from "../../env.ts";
import { decryptText, encryptText } from "../../lib/crypto.ts";
import { publicName } from "../../lib/display-name.ts";
import { assertRateLimit } from "../../lib/rate-limit.ts";
import { HttpError, notFound, ok, pathParam } from "../../http.ts";
import { optionalUser } from "../../middleware/roles.ts";
import { currentUser, requireUser } from "../../middleware/require-user.ts";
import { containsBannedWord } from "../moderation/filter.ts";

export const wallRouter = Router();

const listQuery = z.object({
  category: z.enum([...INTENTION_CATEGORIES, "all"]).default("all"),
  before: z.iso.datetime().optional(),
});

// Muro: solo intenciones aprobadas. Autor como "Nombre I.", sin ids de usuario.
wallRouter.get("/intentions", optionalUser, async (req, res) => {
  const q = listQuery.parse(req.query);
  const items = await prisma.intention.findMany({
    where: {
      status: "approved",
      ...(q.category === "all" ? {} : { category: q.category }),
      ...(q.before ? { createdAt: { lt: new Date(q.before) } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      user: { select: { name: true } },
      _count: { select: { prayers: true } },
      ...(req.user ? { prayers: { where: { userId: req.user.id }, select: { userId: true } } } : {}),
    },
  });
  ok(
    res,
    items.map((i) => ({
      id: i.id,
      author: publicName(i.user.name),
      text: i.text,
      category: i.category,
      prayCount: i._count.prayers,
      alreadyPrayed: "prayers" in i && Array.isArray(i.prayers) ? i.prayers.length > 0 : false,
      createdAt: i.createdAt,
    })),
  );
});

wallRouter.post("/intentions", requireUser, async (req, res) => {
  const user = currentUser(req);
  assertRateLimit(`intention:${user.id}`, 30_000);
  const input = intentionSchema.parse(req.body);
  const flagged = await containsBannedWord(input.text);
  const created = await prisma.intention.create({
    data: { userId: user.id, text: input.text, category: input.category, status: flagged ? "pending" : "approved" },
  });
  // "pending" = pasa a la cola de moderación humana y no se publica todavía.
  ok(res, { id: created.id, status: created.status }, 201);
});

// "Rezo por ti": una vez por persona y solo sobre intenciones publicadas.
wallRouter.post("/intentions/:id/pray", requireUser, async (req, res) => {
  const user = currentUser(req);
  const intention = await prisma.intention.findFirst({ where: { id: pathParam(req, "id"), status: "approved" } });
  if (!intention) throw notFound("Intención");
  await prisma.intentionPrayer.upsert({
    where: { intentionId_userId: { intentionId: intention.id, userId: user.id } },
    create: { intentionId: intention.id, userId: user.id },
    update: {},
  });
  const prayCount = await prisma.intentionPrayer.count({ where: { intentionId: intention.id } });
  ok(res, { prayCount, alreadyPrayed: true });
});

// Intenciones privadas ("por quién rezo hoy"): cifradas, solo las ve su autor.
wallRouter.get("/me/intentions", requireUser, async (req, res) => {
  const user = currentUser(req);
  const items = await prisma.privateIntention.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  ok(
    res,
    items.map((i) => ({ id: i.id, text: decryptText(i.textEncrypted, env.INTENTIONS_KEY), createdAt: i.createdAt })),
  );
});

wallRouter.post("/me/intentions", requireUser, async (req, res) => {
  const user = currentUser(req);
  const { text } = privateIntentionSchema.parse(req.body);
  const created = await prisma.privateIntention.create({
    data: { userId: user.id, textEncrypted: encryptText(text, env.INTENTIONS_KEY) },
  });
  ok(res, { id: created.id, text, createdAt: created.createdAt }, 201);
});

wallRouter.delete("/me/intentions/:id", requireUser, async (req, res) => {
  const user = currentUser(req);
  const { count } = await prisma.privateIntention.deleteMany({ where: { id: pathParam(req, "id"), userId: user.id } });
  if (count === 0) throw new HttpError(404, "not_found", "Intención no encontrada");
  ok(res, { deleted: true });
});
