import { Router } from "express";
import { pushTokenSchema } from "@msc/shared";
import { z } from "zod";

import { prisma } from "../../db.ts";
import { ok } from "../../http.ts";
import { currentUser, requireUser } from "../../middleware/require-user.ts";

export const pushRouter = Router();

// Registra el token del dispositivo. Si el dispositivo tenía otra cuenta, pasa a esta.
pushRouter.put("/me/push-tokens", requireUser, async (req, res) => {
  const user = currentUser(req);
  const { token, platform } = pushTokenSchema.parse(req.body);
  await prisma.pushToken.upsert({
    where: { token },
    create: { token, platform, userId: user.id },
    update: { platform, userId: user.id },
  });
  ok(res, { registered: true });
});

// Al cerrar sesión: el dispositivo deja de recibir avisos de esta cuenta.
pushRouter.delete("/me/push-tokens", requireUser, async (req, res) => {
  const user = currentUser(req);
  const { token } = z.object({ token: z.string().min(1) }).parse(req.body);
  const { count } = await prisma.pushToken.deleteMany({ where: { token, userId: user.id } });
  ok(res, { removed: count });
});
