// Gestión de contenido del panel (SDD-02: santoral y contenido diario con audio; SDD-05 US-19).
// Rol editor. Cada cambio queda en admin_audit_log.
import { Router } from "express";
import { dailyContentInputSchema, saintInputSchema, saintUpdateSchema, uploadRequestSchema } from "@msc/shared";
import { z } from "zod";

import { prisma } from "../../db.ts";
import { audit } from "../../lib/audit.ts";
import { createUpload, storageConfigured } from "../../lib/storage.ts";
import { HttpError, notFound, ok, pathParam } from "../../http.ts";
import { requireRole } from "../../middleware/roles.ts";
import { currentUser } from "../../middleware/require-user.ts";

export const contentRouter = Router();
const editor = requireRole("editor");

// --- Subidas a R2 --------------------------------------------------------------

contentRouter.post("/admin/uploads", ...editor, async (req, res) => {
  if (!storageConfigured()) {
    throw new HttpError(503, "storage_not_configured", "El almacenamiento de medios (R2) no está configurado");
  }
  const input = uploadRequestSchema.parse(req.body);
  ok(res, await createUpload(input), 201);
});

// --- Santoral ------------------------------------------------------------------

function slugify(name: string) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 60);
}

async function newSaintId(name: string) {
  const base = `saint_${slugify(name) || "santo"}`;
  for (let i = 1; ; i++) {
    const id = i === 1 ? base : `${base}_${i}`;
    if (!(await prisma.saint.findUnique({ where: { id }, select: { id: true } }))) return id;
  }
}

contentRouter.get("/admin/saints", ...editor, async (_req, res) => {
  const saints = await prisma.saint.findMany({ orderBy: [{ deletedAt: { sort: "asc", nulls: "first" } }, { sortOrder: "asc" }, { name: "asc" }] });
  ok(res, saints);
});

contentRouter.post("/admin/saints", ...editor, async (req, res) => {
  const actor = currentUser(req);
  const input = saintInputSchema.parse(req.body);
  const id = await newSaintId(input.name);
  const saint = await prisma.$transaction(async (tx) => {
    const s = await tx.saint.create({ data: { id, ...input } });
    await audit(tx, actor.id, "saint.create", "saint", s.id, { name: s.name });
    return s;
  });
  ok(res, saint, 201);
});

contentRouter.patch("/admin/saints/:id", ...editor, async (req, res) => {
  const actor = currentUser(req);
  const input = saintUpdateSchema.parse(req.body);
  const saint = await prisma.$transaction(async (tx) => {
    const found = await tx.saint.findUnique({ where: { id: pathParam(req, "id") } });
    if (!found) throw notFound("Santo");
    const s = await tx.saint.update({ where: { id: found.id }, data: input });
    await audit(tx, actor.id, "saint.update", "saint", s.id, { fields: Object.keys(input) });
    return s;
  });
  ok(res, saint);
});

// Baja lógica: deja de verse en la app. No se permite si es el santo patrón de alguien o el
// santo de un día futuro: su altar o ese día quedarían sin santo.
contentRouter.delete("/admin/saints/:id", ...editor, async (req, res) => {
  const actor = currentUser(req);
  const id = pathParam(req, "id");
  const found = await prisma.saint.findUnique({ where: { id } });
  if (!found) throw notFound("Santo");
  const today = new Date().toISOString().slice(0, 10);
  const [patrons, upcoming] = await Promise.all([
    prisma.user.count({ where: { patronSaintId: id } }),
    prisma.dailyContent.count({ where: { saintOfDayId: id, date: { gte: today } } }),
  ]);
  if (patrons > 0 || upcoming > 0) {
    throw new HttpError(409, "saint_in_use", `Santo en uso: patrón de ${patrons} fieles, santo del día en ${upcoming} días próximos`);
  }
  await prisma.$transaction(async (tx) => {
    await tx.saint.update({ where: { id }, data: { deletedAt: new Date() } });
    await audit(tx, actor.id, "saint.delete", "saint", id, { name: found.name });
  });
  ok(res, { id, deleted: true });
});

contentRouter.post("/admin/saints/:id/restore", ...editor, async (req, res) => {
  const actor = currentUser(req);
  const id = pathParam(req, "id");
  const found = await prisma.saint.findUnique({ where: { id } });
  if (!found) throw notFound("Santo");
  await prisma.$transaction(async (tx) => {
    await tx.saint.update({ where: { id }, data: { deletedAt: null } });
    await audit(tx, actor.id, "saint.restore", "saint", id, { name: found.name });
  });
  ok(res, { id, deleted: false });
});

// --- Contenido diario ------------------------------------------------------------

const isoDate = z.iso.date();

function addDays(date: string, n: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Calendario de los próximos días: qué está listo y qué falta (texto, santo, audio por idioma).
contentRouter.get("/admin/daily", ...editor, async (req, res) => {
  const q = z
    .object({ from: isoDate.optional(), days: z.coerce.number().int().min(1).max(62).default(14) })
    .parse(req.query);
  const from = q.from ?? new Date().toISOString().slice(0, 10);
  const to = addDays(from, q.days - 1);
  const rows = await prisma.dailyContent.findMany({
    where: { date: { gte: from, lte: to } },
    include: { saintOfDay: { select: { name: true } } },
  });
  const byDate = new Map(rows.map((r) => [r.date, r]));
  const days = Array.from({ length: q.days }, (_, i) => {
    const date = addDays(from, i);
    const r = byDate.get(date);
    return r
      ? {
          date,
          filled: true,
          saintOfDay: r.saintOfDay?.name ?? null,
          gospelRef: r.gospelRef,
          audio: {
            morning: { es: !!r.morningAudioUrlEs, en: !!r.morningAudioUrlEn },
            night: { es: !!r.nightAudioUrlEs, en: !!r.nightAudioUrlEn },
            meditation: { es: !!r.meditationAudioUrlEs, en: !!r.meditationAudioUrlEn },
          },
        }
      : { date, filled: false, saintOfDay: null, gospelRef: null, audio: null };
  });
  ok(res, days);
});

contentRouter.get("/admin/daily/:date", ...editor, async (req, res) => {
  const date = isoDate.parse(pathParam(req, "date"));
  ok(res, await prisma.dailyContent.findUnique({ where: { date } }));
});

contentRouter.put("/admin/daily/:date", ...editor, async (req, res) => {
  const actor = currentUser(req);
  const date = isoDate.parse(pathParam(req, "date"));
  const input = dailyContentInputSchema.parse(req.body);
  if (input.saintOfDayId) {
    const saint = await prisma.saint.findFirst({ where: { id: input.saintOfDayId, deletedAt: null }, select: { id: true } });
    if (!saint) throw new HttpError(400, "invalid_saint", "Santo no válido");
  }
  const saved = await prisma.$transaction(async (tx) => {
    const existed = await tx.dailyContent.findUnique({ where: { date }, select: { date: true } });
    const row = await tx.dailyContent.upsert({ where: { date }, create: { date, ...input }, update: input });
    await audit(tx, actor.id, existed ? "daily.update" : "daily.create", "daily_content", date, { saintOfDayId: row.saintOfDayId });
    return row;
  });
  ok(res, saved);
});
