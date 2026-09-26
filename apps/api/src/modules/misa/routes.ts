import { Router } from "express";

import { prisma } from "../../db.ts";
import { publicName } from "../../lib/display-name.ts";
import { notFound, ok, pathParam } from "../../http.ts";
import { currentOrNextMass, massDto } from "./service.ts";

export const misaRouter = Router();

misaRouter.get("/masses/next", async (_req, res) => {
  const mass = await currentOrNextMass();
  ok(res, mass ? massDto(mass) : null);
});

misaRouter.get("/masses/:id/chat", async (req, res) => {
  const mass = await prisma.mass.findUnique({ where: { id: pathParam(req, "id") } });
  if (!mass) throw notFound("Misa");
  const messages = await prisma.chatMessage.findMany({
    where: { massId: mass.id, status: "approved" },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { user: { select: { name: true } } },
  });
  ok(
    res,
    messages.reverse().map((m) => ({ id: m.id, author: publicName(m.user.name), text: m.text, createdAt: m.createdAt })),
  );
});
