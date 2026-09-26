import cors from "cors";
import express from "express";
import { toNodeHandler } from "better-auth/node";

import { auth } from "./auth.ts";
import { env } from "./env.ts";
import { errorHandler, ok } from "./http.ts";
import { candlesRouter } from "./modules/candles/routes.ts";
import { ritualRouter } from "./modules/ritual/routes.ts";
import { usersRouter } from "./modules/users/routes.ts";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");

  const origins = env.TRUSTED_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean);
  app.use(cors({ origin: origins, credentials: true, exposedHeaders: ["set-auth-token"] }));

  // Better Auth debe ir antes de express.json(): lee el cuerpo por su cuenta.
  app.all("/api/auth/{*any}", toNodeHandler(auth));

  app.use(express.json({ limit: "100kb" }));

  app.get("/api/health", (_req, res) => ok(res, { status: "ok" }));
  app.use("/api", usersRouter);
  app.use("/api", ritualRouter);
  app.use("/api", candlesRouter);

  app.use(errorHandler);
  return app;
}
