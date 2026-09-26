import type { NextFunction, Request, Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import type { Role } from "@msc/shared";

import { auth } from "../auth.ts";
import { prisma } from "../db.ts";
import { HttpError } from "../http.ts";
import { currentUser, requireUser } from "./require-user.ts";

// superadmin pasa siempre; el resto solo con uno de los roles indicados.
export function requireRole(...roles: Role[]) {
  return [
    requireUser,
    (req: Request, _res: Response, next: NextFunction) => {
      const user = currentUser(req);
      if (user.role !== "superadmin" && !roles.includes(user.role)) {
        throw new HttpError(403, "forbidden", "Permisos insuficientes");
      }
      next();
    },
  ];
}

// Rutas públicas que se enriquecen si hay sesión (p. ej. "ya he rezado por esta intención").
export async function optionalUser(req: Request, _res: Response, next: NextFunction) {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) }).catch(() => null);
  if (session) {
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (user && !user.blocked) req.user = user;
  }
  next();
}
