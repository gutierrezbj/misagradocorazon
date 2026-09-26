import { Router } from "express";
import { prayerCompleteSchema } from "@msc/shared";
import { z } from "zod";

import { prisma } from "../../db.ts";
import { isValidTimeZone, localDate } from "../../lib/dates.ts";
import { HttpError, notFound, ok } from "../../http.ts";
import { currentUser, requireUser } from "../../middleware/require-user.ts";
import { dailyDto, saintDto } from "./serializers.ts";
import { currentStreak } from "./streak.ts";

export const ritualRouter = Router();

ritualRouter.get("/saints", async (req, res) => {
  const patronOnly = req.query.patronOnly === "true";
  const saints = await prisma.saint.findMany({
    where: { deletedAt: null, ...(patronOnly ? { isPatronCatalog: true } : {}) },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  ok(res, saints.map(saintDto));
});

ritualRouter.get("/saints/:id", async (req, res) => {
  const saint = await prisma.saint.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!saint) throw notFound("Santo");
  ok(res, saintDto(saint));
});

const dailyQuery = z.object({
  date: z.iso.date().optional(),
  tz: z.string().refine(isValidTimeZone, "Zona horaria no válida").optional(),
});

// Sin contenido para la fecha pedida → 404. Nunca se sirve en silencio el evangelio de otro día.
ritualRouter.get("/daily", async (req, res) => {
  const q = dailyQuery.parse(req.query);
  const date = q.date ?? localDate(new Date(), q.tz ?? "America/Mexico_City");
  const content = await prisma.dailyContent.findUnique({ where: { date }, include: { saintOfDay: true } });
  if (!content) throw new HttpError(404, "no_content", `No hay contenido para ${date}`);
  ok(res, dailyDto(content));
});

ritualRouter.post("/prayers/complete", requireUser, async (req, res) => {
  const user = currentUser(req);
  const { kind } = prayerCompleteSchema.parse(req.body);
  const today = localDate(new Date(), user.timezone);
  await prisma.prayerLog.upsert({
    where: { userId_localDate_kind: { userId: user.id, localDate: today, kind } },
    create: { userId: user.id, localDate: today, kind },
    update: {},
  });
  ok(res, { streak: await currentStreak(user.id, user.timezone) });
});
