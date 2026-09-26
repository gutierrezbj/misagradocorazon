// Gestión mínima para operar los pilares. El panel web (apps/admin) consumirá estas rutas.
// Toda acción queda en admin_audit_log.
import { Router } from "express";
import {
  causeInputSchema,
  causeUpdateInputSchema,
  massInputSchema,
  moderationDecisionSchema,
  moderationWordSchema,
  pushCampaignSchema,
  ROLES,
} from "@msc/shared";
import { z } from "zod";

import { prisma } from "../../db.ts";
import { audit } from "../../lib/audit.ts";
import { monthOf } from "../../lib/dates.ts";
import { publicName } from "../../lib/display-name.ts";
import { HttpError, notFound, ok, pathParam } from "../../http.ts";
import { requireRole } from "../../middleware/roles.ts";
import { currentUser } from "../../middleware/require-user.ts";
import { causeDto } from "../causas/service.ts";
import { getIo, roomOf } from "../misa/chat.ts";
import { massDto } from "../misa/service.ts";
import { normalizeText } from "../moderation/filter.ts";
import { reachable } from "../push/service.ts";
import { computeKpis } from "./kpis.ts";

export const adminRouter = Router();

const moderator = requireRole("moderator");
const editor = requireRole("editor");
const superadmin = requireRole("superadmin");

// --- Moderación -------------------------------------------------------------

adminRouter.get("/admin/moderation/queue", ...moderator, async (_req, res) => {
  const [intentions, chat] = await Promise.all([
    prisma.intention.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { name: true } } },
    }),
    prisma.chatMessage.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { name: true } } },
    }),
  ]);
  ok(res, {
    intentions: intentions.map((i) => ({ id: i.id, author: publicName(i.user.name), text: i.text, category: i.category, createdAt: i.createdAt })),
    chat: chat.map((m) => ({ id: m.id, massId: m.massId, author: publicName(m.user.name), text: m.text, createdAt: m.createdAt })),
  });
});

adminRouter.post("/admin/moderation/intentions/:id", ...moderator, async (req, res) => {
  const actor = currentUser(req);
  const { action, reason } = moderationDecisionSchema.parse(req.body);
  const status = action === "approve" ? "approved" : "hidden";
  const updated = await prisma.$transaction(async (tx) => {
    const found = await tx.intention.findUnique({ where: { id: pathParam(req, "id") } });
    if (!found) throw notFound("Intención");
    const u = await tx.intention.update({ where: { id: found.id }, data: { status } });
    await audit(tx, actor.id, `intention.${action}`, "intention", found.id, { from: found.status, reason: reason ?? null });
    return u;
  });
  ok(res, { id: updated.id, status: updated.status });
});

adminRouter.post("/admin/moderation/chat/:id", ...moderator, async (req, res) => {
  const actor = currentUser(req);
  const { action, reason } = moderationDecisionSchema.parse(req.body);
  const status = action === "approve" ? "approved" : "hidden";
  const updated = await prisma.$transaction(async (tx) => {
    const found = await tx.chatMessage.findUnique({ where: { id: pathParam(req, "id") }, include: { user: { select: { name: true } } } });
    if (!found) throw notFound("Mensaje");
    const u = await tx.chatMessage.update({ where: { id: found.id }, data: { status } });
    await audit(tx, actor.id, `chat.${action}`, "chat_message", found.id, { from: found.status, reason: reason ?? null });
    return { ...u, author: publicName(found.user.name) };
  });
  // Tiempo real: aparece o desaparece para todos los que están en la misa.
  const room = getIo()?.to(roomOf(updated.massId));
  if (status === "hidden") room?.emit("chat:removed", { id: updated.id });
  else room?.emit("chat:message", { id: updated.id, author: updated.author, text: updated.text, createdAt: updated.createdAt });
  ok(res, { id: updated.id, status: updated.status });
});

adminRouter.get("/admin/moderation/words", ...moderator, async (_req, res) => {
  const words = await prisma.moderationWord.findMany({ orderBy: { word: "asc" } });
  ok(res, words.map((w) => w.word));
});

adminRouter.post("/admin/moderation/words", ...moderator, async (req, res) => {
  const actor = currentUser(req);
  const word = normalizeText(moderationWordSchema.parse(req.body).word);
  await prisma.moderationWord.upsert({ where: { word }, create: { word }, update: {} });
  await audit(prisma, actor.id, "moderation_word.add", "moderation_word", word);
  ok(res, { word }, 201);
});

adminRouter.delete("/admin/moderation/words/:word", ...moderator, async (req, res) => {
  const actor = currentUser(req);
  const word = normalizeText(pathParam(req, "word"));
  const { count } = await prisma.moderationWord.deleteMany({ where: { word } });
  if (count === 0) throw notFound("Palabra");
  await audit(prisma, actor.id, "moderation_word.remove", "moderation_word", word);
  ok(res, { deleted: true });
});

// --- Misas -------------------------------------------------------------------

adminRouter.post("/admin/masses", ...editor, async (req, res) => {
  const actor = currentUser(req);
  const input = massInputSchema.parse(req.body);
  const mass = await prisma.mass.create({ data: { ...input, scheduledAt: new Date(input.scheduledAt) } });
  await audit(prisma, actor.id, "mass.create", "mass", mass.id);
  ok(res, massDto(mass), 201);
});

adminRouter.patch("/admin/masses/:id", ...editor, async (req, res) => {
  const actor = currentUser(req);
  const input = massInputSchema.partial().parse(req.body);
  const exists = await prisma.mass.findUnique({ where: { id: pathParam(req, "id") } });
  if (!exists) throw notFound("Misa");
  const mass = await prisma.mass.update({
    where: { id: exists.id },
    data: { ...input, ...(input.scheduledAt ? { scheduledAt: new Date(input.scheduledAt) } : {}) },
  });
  await audit(prisma, actor.id, "mass.update", "mass", mass.id, { fields: Object.keys(input) });
  ok(res, massDto(mass));
});

// --- Causas ------------------------------------------------------------------

adminRouter.get("/admin/causes", ...editor, async (_req, res) => {
  const causes = await prisma.cause.findMany({ orderBy: [{ month: "desc" }, { createdAt: "asc" }] });
  ok(res, causes.map((c) => causeDto(c)));
});

adminRouter.post("/admin/causes", ...editor, async (req, res) => {
  const actor = currentUser(req);
  const input = causeInputSchema.parse(req.body);
  // Solo se preparan causas para el mes en curso o futuros.
  if (input.month < monthOf(new Date())) throw new HttpError(400, "past_month", "No se crean causas para meses pasados");
  const cause = await prisma.cause.create({ data: input });
  await audit(prisma, actor.id, "cause.create", "cause", cause.id);
  ok(res, causeDto(cause), 201);
});

// Solo se edita mientras es candidata: una vez en votación, la ficha que se votó no cambia.
adminRouter.patch("/admin/causes/:id", ...editor, async (req, res) => {
  const actor = currentUser(req);
  const input = causeInputSchema.partial().parse(req.body);
  const cause = await prisma.cause.findUnique({ where: { id: pathParam(req, "id") } });
  if (!cause) throw notFound("Causa");
  if (cause.status !== "candidate") throw new HttpError(409, "cause_locked", "La causa ya está en votación o cerrada");
  const updated = await prisma.cause.update({ where: { id: cause.id }, data: input });
  await audit(prisma, actor.id, "cause.update", "cause", cause.id, { fields: Object.keys(input) });
  ok(res, causeDto(updated));
});

adminRouter.post("/admin/causes/:id/updates", ...editor, async (req, res) => {
  const actor = currentUser(req);
  const input = causeUpdateInputSchema.parse(req.body);
  const cause = await prisma.cause.findUnique({ where: { id: pathParam(req, "id") } });
  if (!cause) throw notFound("Causa");
  if (cause.status !== "won" && cause.status !== "funded") throw new HttpError(409, "not_winner", "Solo las causas ganadoras publican avances");
  const update = await prisma.causeUpdate.create({ data: { causeId: cause.id, ...input } });
  await audit(prisma, actor.id, "cause.progress", "cause", cause.id, { updateId: update.id });
  ok(res, { id: update.id }, 201);
});

// Transferencia real a la causa ganadora: queda en el libro y la marca como financiada.
const transferSchema = z.object({ amountCents: z.number().int().positive(), note: z.string().trim().max(300).optional() });

adminRouter.post("/admin/causes/:id/transfers", ...superadmin, async (req, res) => {
  const actor = currentUser(req);
  const { amountCents, note } = transferSchema.parse(req.body);
  const result = await prisma.$transaction(async (tx) => {
    const cause = await tx.cause.findUnique({ where: { id: pathParam(req, "id") } });
    if (!cause) throw notFound("Causa");
    if (cause.status !== "won" && cause.status !== "funded") throw new HttpError(409, "not_winner", "Solo se transfiere a causas ganadoras");
    const entry = await tx.ledgerEntry.create({
      data: { type: "transfer", amountCents, month: cause.month, causeId: cause.id, note: note ?? null },
    });
    await tx.cause.update({ where: { id: cause.id }, data: { status: "funded" } });
    await audit(tx, actor.id, "cause.transfer", "cause", cause.id, { ledgerEntryId: entry.id, amountCents });
    return entry;
  });
  ok(res, { ledgerEntryId: result.id }, 201);
});

// --- KPIs --------------------------------------------------------------------

const kpiQuery = z.object({ days: z.coerce.number().int().min(1).max(365).default(30) });

// Métricas del negocio: cualquier miembro del staff las ve.
adminRouter.get("/admin/kpis", ...requireRole("moderator", "editor"), async (req, res) => {
  const { days } = kpiQuery.parse(req.query);
  ok(res, await computeKpis(days));
});

// --- Misas (listado) -----------------------------------------------------------

adminRouter.get("/admin/masses", ...editor, async (_req, res) => {
  const masses = await prisma.mass.findMany({ orderBy: { scheduledAt: "desc" }, take: 100 });
  ok(res, masses.map((m) => massDto(m)));
});

// --- Usuarios y roles (solo superadmin) ------------------------------------------

const userQuery = z.object({ search: z.string().trim().max(100).optional() });

adminRouter.get("/admin/users", ...superadmin, async (req, res) => {
  const { search } = userQuery.parse(req.query);
  const users = await prisma.user.findMany({
    where: search
      ? { OR: [{ email: { contains: search, mode: "insensitive" } }, { name: { contains: search, mode: "insensitive" } }] }
      : {},
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, name: true, email: true, role: true, blocked: true, onboarded: true, createdAt: true },
  });
  ok(res, users);
});

const userPatchSchema = z
  .object({ role: z.enum(ROLES).optional(), blocked: z.boolean().optional() })
  .refine((v) => v.role !== undefined || v.blocked !== undefined, "Nada que cambiar");

adminRouter.patch("/admin/users/:id", ...superadmin, async (req, res) => {
  const actor = currentUser(req);
  const input = userPatchSchema.parse(req.body);
  const targetId = pathParam(req, "id");
  if (targetId === actor.id) throw new HttpError(409, "self_change", "No puedes cambiar tu propio rol ni bloquearte");
  const updated = await prisma.$transaction(async (tx) => {
    const target = await tx.user.findUnique({ where: { id: targetId } });
    if (!target) throw notFound("Usuario");
    // Nunca dejar el sistema sin superadmin activo.
    const losesSuperadmin = target.role === "superadmin" && (input.role !== undefined && input.role !== "superadmin" || input.blocked === true);
    if (losesSuperadmin) {
      const others = await tx.user.count({ where: { role: "superadmin", blocked: false, id: { not: target.id } } });
      if (others === 0) throw new HttpError(409, "last_superadmin", "Debe quedar al menos un superadmin activo");
    }
    const u = await tx.user.update({ where: { id: target.id }, data: input });
    await audit(tx, actor.id, "user.update", "user", target.id, {
      from: { role: target.role, blocked: target.blocked },
      to: { role: u.role, blocked: u.blocked },
    });
    return u;
  });
  // Bloquear corta las sesiones abiertas.
  if (input.blocked) await prisma.session.deleteMany({ where: { userId: updated.id } });
  ok(res, { id: updated.id, role: updated.role, blocked: updated.blocked });
});

// --- Notificaciones (avisos del equipo) --------------------------------------
// Se crean aquí y las envía el worker en el minuto siguiente. Llegan a quien acepta avisos de la comunidad.

const audienceWhere = { ...reachable, notifyCommunity: true };

adminRouter.get("/admin/push/campaigns", ...editor, async (_req, res) => {
  const [campaigns, audience] = await Promise.all([
    prisma.pushCampaign.findMany({ orderBy: { createdAt: "desc" }, take: 50, include: { createdBy: { select: { name: true } } } }),
    prisma.user.count({ where: audienceWhere }),
  ]);
  ok(res, {
    audience,
    campaigns: campaigns.map((c) => ({
      id: c.id,
      title: { es: c.titleEs, en: c.titleEn },
      body: { es: c.bodyEs, en: c.bodyEn },
      createdBy: c.createdBy.name,
      createdAt: c.createdAt,
      sentAt: c.sentAt,
      recipients: c.recipients,
    })),
  });
});

adminRouter.post("/admin/push/campaigns", ...editor, async (req, res) => {
  const actor = currentUser(req);
  const input = pushCampaignSchema.parse(req.body);
  const created = await prisma.$transaction(async (tx) => {
    const c = await tx.pushCampaign.create({ data: { ...input, createdById: actor.id } });
    await audit(tx, actor.id, "push.campaign_create", "push_campaign", c.id, { titleEs: c.titleEs });
    return c;
  });
  ok(res, { id: created.id, sentAt: null }, 201);
});
