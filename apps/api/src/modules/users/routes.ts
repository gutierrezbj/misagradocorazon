import { Router } from "express";
import { onboardingSchema, profileUpdateSchema } from "@msc/shared";

import { prisma } from "../../db.ts";
import { isValidTimeZone } from "../../lib/dates.ts";
import { HttpError, ok } from "../../http.ts";
import { currentUser, requireUser } from "../../middleware/require-user.ts";
import { profileDto } from "../ritual/serializers.ts";
import { currentStreak } from "../ritual/streak.ts";

export const usersRouter = Router();

async function assertSaintsExist(ids: string[]) {
  if (ids.length === 0) return;
  const found = await prisma.saint.count({ where: { id: { in: ids }, deletedAt: null } });
  if (found !== new Set(ids).size) throw new HttpError(400, "invalid_saint", "Santo no válido");
}

function assertTimeZone(tz: string | undefined) {
  if (tz !== undefined && !isValidTimeZone(tz)) throw new HttpError(400, "invalid_timezone", "Zona horaria no válida");
}

usersRouter.get("/me", requireUser, async (req, res) => {
  const user = currentUser(req);
  ok(res, profileDto(user, await currentStreak(user.id, user.timezone)));
});

usersRouter.put("/me/onboarding", requireUser, async (req, res) => {
  const user = currentUser(req);
  const input = onboardingSchema.parse(req.body);
  assertTimeZone(input.timezone);
  await assertSaintsExist([input.patronSaintId, ...input.secondarySaintIds]);
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { ...input, secondarySaintIds: [...new Set(input.secondarySaintIds)], onboarded: true },
  });
  ok(res, profileDto(updated, await currentStreak(updated.id, updated.timezone)));
});

usersRouter.patch("/me", requireUser, async (req, res) => {
  const user = currentUser(req);
  const input = profileUpdateSchema.parse(req.body);
  assertTimeZone(input.timezone);
  await assertSaintsExist([...(input.patronSaintId ? [input.patronSaintId] : []), ...(input.secondarySaintIds ?? [])]);
  const updated = await prisma.user.update({ where: { id: user.id }, data: input });
  ok(res, profileDto(updated, await currentStreak(updated.id, updated.timezone)));
});
