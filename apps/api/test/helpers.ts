import { readFileSync } from "node:fs";
import request from "supertest";

import { createApp } from "../src/app.ts";
import { prisma } from "../src/db.ts";

export const app = createApp();

export async function resetDb() {
  // Salvaguarda: jamás vaciar una base que no sea explícitamente de tests.
  const dbName = new URL(process.env.DATABASE_URL ?? "").pathname.slice(1);
  if (!dbName.endsWith("_test")) throw new Error(`resetDb se niega a vaciar "${dbName}": no es una base _test`);
  // TRUNCATE no dispara el trigger por fila del libro de movimientos.
  await prisma.$executeRawUnsafe(
    'TRUNCATE "ledger_entry", "candle", "prayer_log", "daily_content", "session", "account", "verification", "user", "saint" CASCADE',
  );
  const saints = JSON.parse(readFileSync(new URL("../prisma/seed-data/saints.json", import.meta.url), "utf8"));
  await prisma.saint.createMany({ data: saints });
}

let counter = 0;
export async function signUp(extra: Record<string, unknown> = {}) {
  counter += 1;
  const email = `fiel${counter}_${Date.now()}@example.com`;
  const res = await request(app)
    .post("/api/auth/sign-up/email")
    .send({ email, password: "Oracion2026!", name: `Fiel ${counter}`, ...extra });
  if (res.status !== 200) throw new Error(`sign-up ${res.status}: ${JSON.stringify(res.body)}`);
  const token = res.headers["set-auth-token"];
  if (!token) throw new Error("sin set-auth-token");
  return { email, token: String(token), userId: String(res.body.user.id) };
}

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
