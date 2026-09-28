import request from "supertest";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { prisma } from "../src/db.ts";
import { env } from "../src/env.ts";
import { decryptText } from "../src/lib/crypto.ts";
import { openVoting } from "../src/modules/causas/service.ts";
import { deletedEmail } from "../src/modules/auth/delete-account.ts";
import { app, bearer, resetDb, signUp, signUpAs } from "./helpers.ts";

// Dentro de la ventana de votación, para poder dejar un voto antes de borrar la cuenta.
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-03T12:00:00Z"));
  await resetDb();
});
afterEach(() => vi.useRealTimers());

const confirm = { confirm: true };

const causeBody = (n: number) => ({
  month: "2026-10",
  nameEs: `Causa ${n}`,
  nameEn: `Cause ${n}`,
  location: "Oaxaca, México",
  responsible: "Parroquia de prueba",
  descriptionEs: "Descripción",
  descriptionEn: "Description",
  fundsUseEs: "Destino",
  fundsUseEn: "Use of funds",
  budgetItems: [{ conceptEs: "Obra", conceptEn: "Works", amountCents: 1_000_000 }],
  timeline: "3 meses",
});

async function openCause() {
  const editor = await signUpAs("editor");
  const ids: string[] = [];
  for (const n of [1, 2, 3]) {
    vi.setSystemTime(new Date(Date.now() + 1000));
    const res = await request(app).post("/api/admin/causes").set(bearer(editor.token)).send(causeBody(n));
    ids.push(String(res.body.data.id));
  }
  await openVoting("2026-10");
  return ids[0]!;
}

describe("borrado de cuenta", () => {
  test("sin confirmación explícita no se borra nada", async () => {
    const u = await signUp();
    const res = await request(app).delete("/api/me").set(bearer(u.token)).send({});
    expect(res.status).toBe(400);
    expect((await request(app).get("/api/me").set(bearer(u.token))).status).toBe(200);
  });

  test("sin sesión → 401", async () => {
    expect((await request(app).delete("/api/me").send(confirm)).status).toBe(401);
  });

  test("borra lo personal, anonimiza al usuario y conserva velas, libro y votos sin vínculo", async () => {
    const causeId = await openCause();
    const u = await signUpAs("user", "María Guadalupe Pérez");
    const other = await signUp();
    const h = bearer(u.token);

    await request(app).put("/api/me/push-tokens").set(h).send({ token: "ExponentPushToken[borrar-cuenta]", platform: "ios" }).expect(200);
    await request(app).post("/api/me/intentions").set(h).send({ text: "Por la conversión de mi hijo" }).expect(201);
    const pub = await request(app).post("/api/intentions").set(h).send({ text: "Por mi madre enferma" });
    const theirs = await request(app).post("/api/intentions").set(bearer(other.token)).send({ text: "Por la paz" });
    await request(app).post(`/api/intentions/${theirs.body.data.id}/pray`).set(h);
    await request(app).post(`/api/intentions/${pub.body.data.id}/pray`).set(bearer(other.token));
    await request(app).post("/api/prayers/complete").set(h).send({ kind: "morning" });
    await request(app).post("/api/candles").set(h).send({ saintId: "saint_guadalupe", intention: "Por mi familia", type: "solemn" }).expect(201);
    await request(app).post(`/api/causes/${causeId}/vote`).set(h).expect(201);

    const before = await request(app).get("/api/transparency");
    const votesBefore = await prisma.vote.count();

    const res = await request(app).delete("/api/me").set(h).send(confirm);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ deleted: true });

    // La sesión ya no vale y no se puede volver a entrar.
    expect((await request(app).get("/api/me").set(h)).status).toBe(401);
    const login = await request(app).post("/api/auth/sign-in/email").send({ email: u.email, password: "Oracion2026!" });
    expect(login.status).not.toBe(200);

    const user = await prisma.user.findUniqueOrThrow({ where: { id: u.userId } });
    expect(user).toMatchObject({ name: "", email: deletedEmail(u.userId), image: null, blocked: true, role: "user", patronSaintId: null });
    expect(user.deletedAt).toBeInstanceOf(Date);
    expect(JSON.stringify(user)).not.toMatch(/María|example\.com/);

    const where = { where: { userId: u.userId } };
    expect(await prisma.session.count(where)).toBe(0);
    expect(await prisma.account.count(where)).toBe(0);
    expect(await prisma.pushToken.count(where)).toBe(0);
    expect(await prisma.privateIntention.count(where)).toBe(0);
    expect(await prisma.intention.count(where)).toBe(0);
    expect(await prisma.intentionPrayer.count(where)).toBe(0);
    expect(await prisma.prayerLog.count(where)).toBe(0);
    // La intención ajena sigue ahí; solo desaparece la oración de esta persona.
    expect(await prisma.intention.count({ where: { userId: other.userId } })).toBe(1);

    // La vela y su dinero se quedan, pero sin el texto de la intención.
    const candle = await prisma.candle.findFirstOrThrow(where);
    expect(decryptText(candle.intentionEncrypted, env.INTENTIONS_KEY)).toBe("");
    const after = await request(app).get("/api/transparency");
    expect(after.body.data.totals).toEqual(before.body.data.totals);
    expect(await prisma.vote.count()).toBe(votesBefore);

    const log = await prisma.adminAuditLog.findFirstOrThrow({ where: { action: "account.delete" } });
    expect(log).toMatchObject({ actorId: u.userId, entityId: u.userId, data: null });
  });

  test("el panel no lista cuentas borradas y los KPIs no las cuentan", async () => {
    const sa = await signUpAs("superadmin");
    const u = await signUp();
    await signUp();
    const kpisBefore = await request(app).get("/api/admin/kpis?days=30").set(bearer(sa.token));
    await request(app).delete("/api/me").set(bearer(u.token)).send(confirm).expect(200);

    const list = await request(app).get("/api/admin/users").set(bearer(sa.token));
    expect(list.body.data.map((x: { id: string }) => x.id)).not.toContain(u.userId);
    const kpisAfter = await request(app).get("/api/admin/kpis?days=30").set(bearer(sa.token));
    expect(kpisAfter.body.data.users.total).toBe(kpisBefore.body.data.users.total - 1);
  });

  test("el último superadmin activo no puede borrar su cuenta", async () => {
    const sa = await signUpAs("superadmin");
    const res = await request(app).delete("/api/me").set(bearer(sa.token)).send(confirm);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("last_superadmin");

    await signUpAs("superadmin");
    expect((await request(app).delete("/api/me").set(bearer(sa.token)).send(confirm)).status).toBe(200);
  });

  test("el mismo email puede registrarse de nuevo como cuenta nueva", async () => {
    const u = await signUp();
    await request(app).delete("/api/me").set(bearer(u.token)).send(confirm).expect(200);
    const again = await request(app).post("/api/auth/sign-up/email").send({ email: u.email, password: "Oracion2026!", name: "Otra vez" });
    expect(again.status).toBe(200);
    expect(again.body.user.id).not.toBe(u.userId);
  });
});
