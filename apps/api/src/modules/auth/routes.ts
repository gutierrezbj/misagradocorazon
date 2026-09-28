import { Router } from "express";
import { accountDeleteSchema, appleAuthorizationSchema, onboardingSchema, profileUpdateSchema } from "@msc/shared";

import { prisma } from "../../db.ts";
import { isValidTimeZone } from "../../lib/dates.ts";
import { HttpError, ok } from "../../http.ts";
import { mailConfigured } from "../../lib/mail.ts";
import { currentUser, requireUser } from "../../middleware/require-user.ts";
import { profileDto } from "../ritual/serializers.ts";
import { currentStreak } from "../ritual/streak.ts";
import { storeAppleAuthorization } from "./apple-tokens.ts";
import { deleteAccount } from "./delete-account.ts";

export const usersRouter = Router();

async function assertSaintsExist(ids: string[]) {
  if (ids.length === 0) return;
  const found = await prisma.saint.count({ where: { id: { in: ids }, deletedAt: null } });
  if (found !== new Set(ids).size) throw new HttpError(400, "invalid_saint", "Santo no válido");
}

// La fecha del consentimiento cambia solo cuando cambia el consentimiento.
function consentStamp(user: { analyticsConsent: boolean }, consent: boolean | undefined) {
  return consent === undefined || consent === user.analyticsConsent ? {} : { analyticsConsentAt: new Date() };
}

function assertTimeZone(tz: string | undefined) {
  if (tz !== undefined && !isValidTimeZone(tz)) throw new HttpError(400, "invalid_timezone", "Zona horaria no válida");
}

// Qué opciones de acceso ofrece la app según lo configurado en el servidor (sin sesión).
usersRouter.get("/features", (_req, res) => {
  ok(res, { passwordReset: mailConfigured() });
});

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
    data: {
      ...input,
      ...consentStamp(user, input.analyticsConsent),
      secondarySaintIds: [...new Set(input.secondarySaintIds)],
      onboarded: true,
    },
  });
  ok(res, profileDto(updated, await currentStreak(updated.id, updated.timezone)));
});

usersRouter.patch("/me", requireUser, async (req, res) => {
  const user = currentUser(req);
  const input = profileUpdateSchema.parse(req.body);
  assertTimeZone(input.timezone);
  await assertSaintsExist([...(input.patronSaintId ? [input.patronSaintId] : []), ...(input.secondarySaintIds ?? [])]);
  const updated = await prisma.user.update({ where: { id: user.id }, data: { ...input, ...consentStamp(user, input.analyticsConsent) } });
  ok(res, profileDto(updated, await currentStreak(updated.id, updated.timezone)));
});

// Tras entrar con Apple: código de autorización para poder revocar al borrar la cuenta (5.1.1(v)).
usersRouter.post("/me/apple-authorization", requireUser, async (req, res) => {
  const { code } = appleAuthorizationSchema.parse(req.body);
  ok(res, { stored: await storeAppleAuthorization(currentUser(req).id, code) });
});

// Borrado de cuenta (SDD-02). Exige { confirm: true } para que no se dispare por error.
usersRouter.delete("/me", requireUser, async (req, res) => {
  const user = currentUser(req);
  accountDeleteSchema.parse(req.body);
  await deleteAccount(user.id);
  ok(res, { deleted: true });
});
