import request from "supertest";
import { beforeEach, describe, expect, test } from "vitest";

import { prisma } from "../src/db.ts";
import { app, bearer, resetDb, signUp, signUpAs } from "./helpers.ts";

beforeEach(resetDb);

describe("consentimiento de analítica (ADR-011)", () => {
  test("empieza desactivado; darlo y retirarlo deja la fecha de cada cambio", async () => {
    const u = await signUp();
    const h = bearer(u.token);
    expect((await request(app).get("/api/me").set(h)).body.data.analyticsConsent).toBe(false);

    await request(app).put("/api/me/onboarding").set(h).send({ patronSaintId: "saint_guadalupe", analyticsConsent: true }).expect(200);
    const given = await prisma.user.findUniqueOrThrow({ where: { id: u.userId } });
    expect(given.analyticsConsent).toBe(true);
    expect(given.analyticsConsentAt).toBeInstanceOf(Date);

    // Otros cambios del perfil no tocan la fecha del consentimiento.
    await request(app).patch("/api/me").set(h).send({ notifyNight: false, analyticsConsent: true }).expect(200);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: u.userId } })).analyticsConsentAt).toEqual(given.analyticsConsentAt);

    const res = await request(app).patch("/api/me").set(h).send({ analyticsConsent: false });
    expect(res.body.data.analyticsConsent).toBe(false);
    const withdrawn = await prisma.user.findUniqueOrThrow({ where: { id: u.userId } });
    expect(withdrawn.analyticsConsentAt!.getTime()).toBeGreaterThanOrEqual(given.analyticsConsentAt!.getTime());
  });

  test("borrar la cuenta retira el consentimiento", async () => {
    const u = await signUp();
    await request(app).patch("/api/me").set(bearer(u.token)).send({ analyticsConsent: true }).expect(200);
    await request(app).delete("/api/me").set(bearer(u.token)).send({ confirm: true }).expect(200);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: u.userId } })).analyticsConsent).toBe(false);
  });
});

describe("novedades por correo (US-35)", () => {
  test("empieza sin aceptar; aceptarlo y retirarlo deja la fecha de cada cambio", async () => {
    const u = await signUp();
    const h = bearer(u.token);
    expect((await request(app).get("/api/me").set(h)).body.data.newsConsent).toBe(false);

    const res = await request(app).patch("/api/me").set(h).send({ newsConsent: true }).expect(200);
    expect(res.body.data.newsConsent).toBe(true);
    const given = await prisma.user.findUniqueOrThrow({ where: { id: u.userId } });
    expect(given.newsConsentAt).toBeInstanceOf(Date);

    // Repetirlo o cambiar otra cosa no mueve la fecha.
    await request(app).patch("/api/me").set(h).send({ notifyNight: false, newsConsent: true }).expect(200);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: u.userId } })).newsConsentAt).toEqual(given.newsConsentAt);

    await request(app).patch("/api/me").set(h).send({ newsConsent: false }).expect(200);
    const withdrawn = await prisma.user.findUniqueOrThrow({ where: { id: u.userId } });
    expect(withdrawn.newsConsent).toBe(false);
    expect(withdrawn.newsConsentAt!.getTime()).toBeGreaterThanOrEqual(given.newsConsentAt!.getTime());
  });

  test("el registro no lo acepta por su cuenta, ni el onboarding", async () => {
    const u = await signUp({ newsConsent: true });
    await request(app).put("/api/me/onboarding").set(bearer(u.token)).send({ patronSaintId: "saint_guadalupe", newsConsent: true });
    expect((await prisma.user.findUniqueOrThrow({ where: { id: u.userId } })).newsConsent).toBe(false);
  });

  test("solo el superadmin ve el recuento y descarga la lista, que queda registrada", async () => {
    const yes = await signUp({ name: "Ana Pérez" });
    await request(app).patch("/api/me").set(bearer(yes.token)).send({ newsConsent: true, language: "en" }).expect(200);
    await signUp(); // no aceptó
    const gone = await signUp();
    await request(app).patch("/api/me").set(bearer(gone.token)).send({ newsConsent: true }).expect(200);
    await request(app).delete("/api/me").set(bearer(gone.token)).send({ confirm: true }).expect(200);

    const editor = await signUpAs("editor");
    await request(app).get("/api/admin/news-subscribers").set(bearer(editor.token)).expect(403);
    await request(app).post("/api/admin/news-subscribers/export").set(bearer(editor.token)).expect(403);

    const admin = await signUpAs("superadmin");
    const count = await request(app).get("/api/admin/news-subscribers").set(bearer(admin.token)).expect(200);
    expect(count.body.data.count).toBe(1);
    const list = await request(app).post("/api/admin/news-subscribers/export").set(bearer(admin.token)).expect(200);
    expect(list.body.data.items).toEqual([{ name: "Ana Pérez", email: yes.email, language: "en", newsConsentAt: expect.any(String) }]);
    const log = await prisma.adminAuditLog.findFirstOrThrow({ where: { action: "news.export" } });
    expect(log.actorId).toBe(admin.userId);
    expect(log.data).toEqual({ count: 1 });
  });
});
