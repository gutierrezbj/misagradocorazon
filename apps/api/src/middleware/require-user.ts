import type { NextFunction, Request, Response } from "express";
import { fromNodeHeaders } from "better-auth/node";

import { auth } from "../auth.ts";
import { prisma } from "../db.ts";
import type { User } from "../generated/prisma/client.ts";
import { HttpError } from "../http.ts";

declare module "express-serve-static-core" {
  interface Request {
    user?: User;
  }
}

export async function requireUser(req: Request, _res: Response, next: NextFunction) {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  if (!session) throw new HttpError(401, "unauthenticated", "Sesión no válida");
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) throw new HttpError(401, "unauthenticated", "Sesión no válida");
  if (user.blocked) throw new HttpError(403, "blocked", "Cuenta bloqueada");
  req.user = user;
  next();
}

export function currentUser(req: Request): User {
  if (!req.user) throw new HttpError(401, "unauthenticated", "Sesión no válida");
  return req.user;
}
