// Registros del panel (SDD-02, panel de gestión): transparencia con el detalle del libro de
// movimientos, y el registro de auditoría de quién hizo cada cambio. Solo lectura.
import { Router } from "express";
import { z } from "zod";

import type { Prisma } from "../../generated/prisma/client.ts";
import { prisma } from "../../db.ts";
import { ok } from "../../http.ts";
import { requireRole } from "../../middleware/roles.ts";
import { transparencySummary } from "../causas/service.ts";

export const recordsRouter = Router();

const PAGE = 50;
const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

// --- Transparencia -----------------------------------------------------------------

recordsRouter.get("/admin/transparency", ...requireRole("moderator", "editor"), async (_req, res) => {
  ok(res, await transparencySummary());
});

// Movimientos de un mes. Sin datos de personas: la compra enlaza a la vela, no a quien la encendió.
recordsRouter.get("/admin/ledger", ...requireRole("moderator", "editor"), async (req, res) => {
  const q = z
    .object({ month, type: z.enum(["purchase", "impact_allocation", "transfer"]).optional(), cursor: z.string().uuid().optional() })
    .parse(req.query);
  const where: Prisma.LedgerEntryWhereInput = { month: q.month, ...(q.type && { type: q.type }) };
  const rows = await prisma.ledgerEntry.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: PAGE + 1,
    ...(q.cursor && { cursor: { id: q.cursor }, skip: 1 }),
    include: { cause: { select: { nameEs: true, nameEn: true } }, candle: { select: { type: true } } },
  });
  const page = rows.slice(0, PAGE);
  ok(res, {
    entries: page.map((e) => ({
      id: e.id,
      type: e.type,
      amountCents: e.amountCents,
      createdAt: e.createdAt,
      candleType: e.candle?.type ?? null,
      cause: e.cause ? { es: e.cause.nameEs, en: e.cause.nameEn } : null,
      note: e.note,
    })),
    nextCursor: rows.length > PAGE ? page.at(-1)!.id : null,
  });
});

// --- Registro de auditoría (solo superadmin) -------------------------------------------

export const AUDIT_ENTITIES = [
  "cause",
  "mass",
  "saint",
  "daily_content",
  "intention",
  "chat_message",
  "moderation_word",
  "push_campaign",
  "user",
] as const;

recordsRouter.get("/admin/audit", ...requireRole("superadmin"), async (req, res) => {
  const q = z
    .object({ entity: z.enum(AUDIT_ENTITIES).optional(), actorId: z.string().min(1).optional(), cursor: z.string().uuid().optional() })
    .parse(req.query);
  const rows = await prisma.adminAuditLog.findMany({
    where: { ...(q.entity && { entity: q.entity }), ...(q.actorId && { actorId: q.actorId }) },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: PAGE + 1,
    ...(q.cursor && { cursor: { id: q.cursor }, skip: 1 }),
    include: { actor: { select: { id: true, name: true, role: true, deletedAt: true } } },
  });
  const page = rows.slice(0, PAGE);
  ok(res, {
    entries: page.map((e) => ({
      id: e.id,
      action: e.action,
      entity: e.entity,
      entityId: e.entityId,
      data: e.data,
      createdAt: e.createdAt,
      // De una cuenta borrada no queda nombre: se muestra como tal.
      actor: e.actor.deletedAt ? { id: e.actor.id, name: null, role: null, deleted: true } : { ...e.actor, deletedAt: undefined, deleted: false },
    })),
    nextCursor: rows.length > PAGE ? page.at(-1)!.id : null,
  });
});
