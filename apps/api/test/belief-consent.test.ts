import request from "supertest";
import { BELIEF_CONSENT_VERSION } from "@msc/shared";
import { beforeEach, describe, expect, test } from "vitest";

import { prisma } from "../src/db.ts";
import { app, bearer, resetDb, signUp } from "./helpers.ts";

beforeEach(resetDb);

// Consentimiento explícito para los datos de creencias (RGPD art. 9.2.a). Lo comprueba la API,
// no solo la pantalla.
describe("consentimiento de datos de creencias", () => {
  async function publicIntentionId() {
    const author = await signUp();
    const res = await request(app).post("/api/intentions").set(bearer(author.token)).send({ text: "Por la salud de mi madre", category: "salud" }).expect(201);
    return String(res.body.data.id);
  }

  test("sin consentimiento la API no guarda santo, vela, intención, «Rezo por ti» ni oración", async () => {
    const intentionId = await publicIntentionId();
    const u = await signUp({}, { beliefConsent: false });
    const h = bearer(u.token);

    const attempts = [
      request(app).put("/api/me/onboarding").set(h).send({ patronSaintId: "saint_guadalupe" }),
      request(app).patch("/api/me").set(h).send({ patronSaintId: "saint_guadalupe" }),
      request(app)
        .patch("/api/me")
        .set(h)
        .send({ secondarySaintIds: ["saint_guadalupe"] }),
      request(app).post("/api/candles").set(h).send({ saintId: "saint_guadalupe", intention: "Por mi familia", type: "basic" }),
      request(app).post("/api/intentions").set(h).send({ text: "Por la paz", category: "general" }),
      request(app).post(`/api/intentions/${intentionId}/pray`).set(h),
      request(app).post("/api/me/intentions").set(h).send({ text: "Por mi hermano" }),
      request(app).post("/api/prayers/complete").set(h).send({ kind: "morning" }),
    ];
    for (const res of await Promise.all(attempts)) {
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("belief_consent_required");
    }

    const user = await prisma.user.findUniqueOrThrow({ where: { id: u.userId } });
    expect(user.patronSaintId).toBeNull();
    expect(user.secondarySaintIds).toEqual([]);
    expect(await prisma.candle.count({ where: { userId: u.userId } })).toBe(0);
    expect(await prisma.intention.count({ where: { userId: u.userId } })).toBe(0);
    expect(await prisma.intentionPrayer.count({ where: { userId: u.userId } })).toBe(0);
    expect(await prisma.privateIntention.count({ where: { userId: u.userId } })).toBe(0);
    expect(await prisma.prayerLog.count({ where: { userId: u.userId } })).toBe(0);
    // Otros cambios del perfil sí se aceptan: no revelan creencias.
    await request(app).patch("/api/me").set(h).send({ notifyNight: false }).expect(200);
  });

  test("con el consentimiento del onboarding se guarda todo, con fecha y versión del texto", async () => {
    const intentionId = await publicIntentionId();
    const u = await signUp({}, { beliefConsent: false });
    const h = bearer(u.token);
    expect((await request(app).get("/api/me").set(h)).body.data.beliefConsent).toBe(false);

    const res = await request(app).put("/api/me/onboarding").set(h).send({ patronSaintId: "saint_guadalupe", beliefConsent: true }).expect(200);
    expect(res.body.data.beliefConsent).toBe(true);
    expect(res.body.data.beliefConsentVersion).toBe(BELIEF_CONSENT_VERSION);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: u.userId } });
    expect(user.beliefConsentAt).toBeInstanceOf(Date);
    expect(user.beliefConsentVersion).toBe(BELIEF_CONSENT_VERSION);

    await request(app).post("/api/candles").set(h).send({ saintId: "saint_guadalupe", intention: "Por mi familia", type: "basic" }).expect(201);
    await request(app).post("/api/intentions").set(h).send({ text: "Por la paz", category: "general" }).expect(201);
    await request(app).post(`/api/intentions/${intentionId}/pray`).set(h).expect(200);
    await request(app).post("/api/me/intentions").set(h).send({ text: "Por mi hermano" }).expect(201);
    await request(app).post("/api/prayers/complete").set(h).send({ kind: "morning" }).expect(200);
  });

  test("el consentimiento solo acepta true", async () => {
    const u = await signUp({}, { beliefConsent: false });
    await request(app).put("/api/me/onboarding").set(bearer(u.token)).send({ patronSaintId: "saint_guadalupe", beliefConsent: false }).expect(400);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: u.userId } })).beliefConsentAt).toBeNull();
  });

  test("darlo fuera del onboarding no cambia la fecha si ya estaba dado", async () => {
    const u = await signUp({}, { beliefConsent: false });
    const h = bearer(u.token);
    await request(app).post("/api/me/belief-consent").set(h).expect(200);
    const first = (await prisma.user.findUniqueOrThrow({ where: { id: u.userId } })).beliefConsentAt;
    expect(first).toBeInstanceOf(Date);
    await request(app).post("/api/me/belief-consent").set(h).expect(200);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: u.userId } })).beliefConsentAt).toEqual(first);
  });

  test("retirarlo borra los datos de creencias, deja la cuenta y vuelve al onboarding", async () => {
    const other = await signUp();
    const othersIntention = await request(app)
      .post("/api/intentions")
      .set(bearer(other.token))
      .send({ text: "Por mi abuelo", category: "difuntos" })
      .expect(201);
    const u = await signUp();
    const h = bearer(u.token);
    await request(app)
      .put("/api/me/onboarding")
      .set(h)
      .send({ patronSaintId: "saint_guadalupe", secondarySaintIds: ["saint_jose"] })
      .expect(200);
    await request(app).post("/api/candles").set(h).send({ saintId: "saint_guadalupe", intention: "Por mi familia", type: "basic" }).expect(201);
    await request(app).post("/api/intentions").set(h).send({ text: "Por la paz", category: "general" }).expect(201);
    await request(app).post(`/api/intentions/${othersIntention.body.data.id}/pray`).set(h).expect(200);
    await request(app).post("/api/me/intentions").set(h).send({ text: "Por mi hermano" }).expect(201);
    await request(app).post("/api/prayers/complete").set(h).send({ kind: "morning" }).expect(200);

    // Sin confirmación no se borra nada.
    await request(app).delete("/api/me/belief-consent").set(h).send({}).expect(400);
    const res = await request(app).delete("/api/me/belief-consent").set(h).send({ confirm: true }).expect(200);
    expect(res.body.data.beliefConsent).toBe(false);
    expect(res.body.data.onboarded).toBe(false);

    const user = await prisma.user.findUniqueOrThrow({ where: { id: u.userId } });
    expect(user.deletedAt).toBeNull();
    expect(user.beliefConsentAt).toBeNull();
    expect(user.beliefConsentVersion).toBeNull();
    expect(user.patronSaintId).toBeNull();
    expect(user.secondarySaintIds).toEqual([]);
    expect(await prisma.intention.count({ where: { userId: u.userId } })).toBe(0);
    expect(await prisma.intentionPrayer.count({ where: { userId: u.userId } })).toBe(0);
    expect(await prisma.privateIntention.count({ where: { userId: u.userId } })).toBe(0);
    expect(await prisma.prayerLog.count({ where: { userId: u.userId } })).toBe(0);
    // La vela se queda, sin el texto de la intención (igual que al borrar la cuenta).
    const candles = await request(app).get("/api/candles/me").set(h).expect(200);
    expect(candles.body.data.map((c: { intention: string }) => c.intention)).toEqual([""]);
    expect(await prisma.candle.count({ where: { userId: u.userId } })).toBe(1);
    // La intención de otra persona sigue en el muro.
    expect(await prisma.intention.count({ where: { userId: other.userId } })).toBe(1);

    // Y ya no se puede guardar nada nuevo hasta darlo otra vez.
    await request(app).post("/api/candles").set(h).send({ saintId: "saint_guadalupe", intention: "Otra", type: "basic" }).expect(403);
  });

  test("borrar la cuenta retira también este consentimiento", async () => {
    const u = await signUp();
    await request(app).delete("/api/me").set(bearer(u.token)).send({ confirm: true }).expect(200);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: u.userId } });
    expect(user.beliefConsentAt).toBeNull();
    expect(user.beliefConsentVersion).toBeNull();
  });
});
