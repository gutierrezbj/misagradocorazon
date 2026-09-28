import cors from "cors";
import express from "express";
import { toNodeHandler } from "better-auth/node";

import { auth } from "./modules/auth/auth.ts";
import { env } from "./env.ts";
import { prisma } from "./db.ts";
import { errorHandler, HttpError, ok } from "./http.ts";
import { apiLimiter, clientIpForAuth, writeLimiter } from "./middleware/limits.ts";
import { recordsRouter } from "./modules/admin/records.ts";
import { adminRouter } from "./modules/admin/routes.ts";
import { candlesRouter } from "./modules/ritual/candles.ts";
import { causasRouter } from "./modules/causas/routes.ts";
import { contentRouter } from "./modules/admin/content.ts";
import { misaRouter } from "./modules/misa/routes.ts";
import { pushRouter } from "./modules/push/routes.ts";
import { ritualRouter } from "./modules/ritual/routes.ts";
import { usersRouter } from "./modules/auth/routes.ts";
import { wallRouter } from "./modules/ritual/wall.ts";

export function createApp({ rateLimits = env.NODE_ENV !== "test" }: { rateLimits?: boolean } = {}) {
  const app = express();
  app.disable("x-powered-by");
  // Detrás del proxy de Railway: IP y protocolo reales del cliente.
  app.set("trust proxy", 1);

  const origins = env.TRUSTED_ORIGINS.split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  app.use(cors({ origin: origins, credentials: true, exposedHeaders: ["set-auth-token"] }));

  // Cabeceras básicas: la API solo sirve JSON.
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-Frame-Options", "DENY");
    next();
  });

  // Better Auth debe ir antes de express.json(): lee el cuerpo por su cuenta. Tiene sus propios
  // límites de intentos (login y registro: 3 cada 10 s por IP en producción).
  app.all("/api/auth/{*any}", clientIpForAuth, toNodeHandler(auth));

  app.use(express.json({ limit: "100kb" }));

  // Healthcheck del despliegue: la API responde y llega a la base de datos.
  app.get("/api/health", async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new HttpError(503, "db_unavailable", "Base de datos no disponible");
    }
    ok(res, { status: "ok" });
  });
  if (rateLimits) app.use("/api", apiLimiter(), writeLimiter());
  app.use("/api", usersRouter);
  app.use("/api", ritualRouter);
  app.use("/api", candlesRouter);
  app.use("/api", wallRouter);
  app.use("/api", misaRouter);
  app.use("/api", causasRouter);
  app.use("/api", pushRouter);
  app.use("/api", adminRouter);
  app.use("/api", recordsRouter);
  app.use("/api", contentRouter);

  app.use(errorHandler);
  return app;
}
