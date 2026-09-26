import { readFileSync } from "node:fs";
import request from "supertest";

import { createApp } from "../src/app.ts";
import { prisma } from "../src/db.ts";
import { resetRateLimits } from "../src/lib/rate-limit.ts";
import { resetChatRateLimits } from "../src/modules/misa/chat.ts";

// Misma lista que inserta la migración wall_mass_causes.
const DEFAULT_WORDS = ["milagro garantizado", "cadena de oracion", "reenvia esto", "brujeria", "amuleto", "maldicion"];

export const app = createApp();

export async function resetDb() {
  // Salvaguarda: jamás vaciar una base que no sea explícitamente de tests.
  const dbName = new URL(process.env.DATABASE_URL ?? "").pathname.slice(1);
  if (!dbName.endsWith("_test")) throw new Error(`resetDb se niega a vaciar "${dbName}": no es una base _test`);
  // TRUNCATE no dispara el trigger por fila del libro de movimientos.
  await prisma.$executeRawUnsafe(
    `TRUNCATE "ledger_entry", "candle", "prayer_log", "daily_content", "intention_prayer", "intention",
      "private_intention", "chat_message", "mass", "vote", "cause_update", "cause", "admin_audit_log",
      "moderation_word", "session", "account", "verification", "user", "saint" CASCADE`,
  );
  await prisma.moderationWord.createMany({ data: DEFAULT_WORDS.map((word) => ({ word })) });
  resetRateLimits();
  resetChatRateLimits();
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

export async function signUpAs(role: "user" | "moderator" | "editor" | "superadmin", name?: string) {
  const u = await signUp(name ? { name } : {});
  if (role !== "user") await prisma.user.update({ where: { id: u.userId }, data: { role } });
  return u;
}
