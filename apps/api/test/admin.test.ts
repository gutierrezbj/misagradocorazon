import request from "supertest";
import { beforeEach, describe, expect, test } from "vitest";

import { prisma } from "../src/db.ts";
import { app, bearer, resetDb, signUp, signUpAs } from "./helpers.ts";

beforeEach(resetDb);

describe("KPIs", () => {
  test("solo el staff los ve", async () => {
    const user = await signUp();
    const mod = await signUpAs("moderator");
    expect((await request(app).get("/api/admin/kpis").set(bearer(user.token))).status).toBe(403);
    expect((await request(app).get("/api/admin/kpis").set(bearer(mod.token))).status).toBe(200);
  });

  test("cuentan fieles, actividad, velas, dinero y conversión; el staff no infla las cifras", async () => {
    const editor = await signUpAs("editor");
    const a = await signUp();
    const b = await signUp();
    await signUp(); // registrado pero sin actividad
    await request(app).post("/api/candles").set(bearer(a.token)).send({ saintId: "saint_guadalupe", intention: "x", type: "basic" });
    await request(app).post("/api/candles").set(bearer(a.token)).send({ saintId: "saint_judas", intention: "y", type: "solemn" });
    await request(app).post("/api/prayers/complete").set(bearer(b.token)).send({ kind: "morning" });
    await request(app).post("/api/prayers/complete").set(bearer(editor.token)).send({ kind: "morning" });

    const res = await request(app).get("/api/admin/kpis?days=30").set(bearer(editor.token));
    expect(res.status).toBe(200);
    const k = res.body.data;
    expect(k.users).toMatchObject({ total: 3, new: 3 });
    expect(k.active).toMatchObject({ dau: 2, wau: 2, mau: 2 });
    expect(k.candles).toMatchObject({ total: 2, buyers: 1, conversionRate: 50 });
    expect(k.candles.byType).toEqual([
      { type: "basic", candles: 1 },
      { type: "solemn", candles: 1 },
      { type: "permanent", candles: 0 },
    ]);
    expect(k.candles.bySaint).toHaveLength(2);
    expect(k.candles.byDay.at(-1).candles).toBe(2);
    expect(k.money).toEqual({ simulated: true, revenueCents: 298, impactCents: 60, transferredCents: 0 });
  });

  test("retención D7: cohorte de hace 7-37 días con actividad en su segunda semana", async () => {
    const editor = await signUpAs("editor");
    const u = await signUp();
    const v = await signUp();
    const tenDaysAgo = new Date(Date.now() - 10 * 86_400_000);
    await prisma.user.updateMany({ where: { id: { in: [u.userId, v.userId] } }, data: { createdAt: tenDaysAgo } });
    // u vuelve el día 8 tras su alta; v no vuelve.
    await prisma.prayerLog.create({
      data: { userId: u.userId, localDate: "2026-01-01", kind: "morning", createdAt: new Date(tenDaysAgo.getTime() + 8 * 86_400_000) },
    });
    const res = await request(app).get("/api/admin/kpis").set(bearer(editor.token));
    expect(res.body.data.retention.d7).toEqual({ cohort: 2, rate: 50 });
  });
});

describe("usuarios y roles", () => {
  test("solo el superadmin gestiona usuarios", async () => {
    const editor = await signUpAs("editor");
    expect((await request(app).get("/api/admin/users").set(bearer(editor.token))).status).toBe(403);
  });

  test("buscar, cambiar rol y queda auditado", async () => {
    const sa = await signUpAs("superadmin");
    const target = await signUpAs("user", "Carmen Rodríguez");
    const list = await request(app).get("/api/admin/users?search=carmen").set(bearer(sa.token));
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0]).not.toHaveProperty("password");

    const res = await request(app).patch(`/api/admin/users/${target.userId}`).set(bearer(sa.token)).send({ role: "moderator" });
    expect(res.body.data.role).toBe("moderator");
    const log = await prisma.adminAuditLog.findFirstOrThrow({ where: { action: "user.update", entityId: target.userId } });
    expect(log.data).toMatchObject({ from: { role: "user" }, to: { role: "moderator" } });
  });

  test("bloquear corta la sesión abierta", async () => {
    const sa = await signUpAs("superadmin");
    const target = await signUp();
    await request(app).patch(`/api/admin/users/${target.userId}`).set(bearer(sa.token)).send({ blocked: true });
    expect((await request(app).get("/api/me").set(bearer(target.token))).status).toBe(401);
  });

  test("nadie se cambia su propio rol ni se bloquea", async () => {
    const sa = await signUpAs("superadmin");
    const res = await request(app).patch(`/api/admin/users/${sa.userId}`).set(bearer(sa.token)).send({ role: "user" });
    expect(res.status).toBe(409);
  });

  test("un superadmin puede degradar a otro; siempre queda el que actúa", async () => {
    // Como nadie puede cambiarse a sí mismo, el superadmin que actúa siempre sigue activo.
    // La comprobación "último superadmin" del endpoint es una defensa adicional.
    const sa1 = await signUpAs("superadmin");
    const sa2 = await signUpAs("superadmin");
    const res = await request(app).patch(`/api/admin/users/${sa2.userId}`).set(bearer(sa1.token)).send({ role: "editor" });
    expect(res.status).toBe(200);
    expect(await prisma.user.count({ where: { role: "superadmin", blocked: false } })).toBe(1);
  });
});
