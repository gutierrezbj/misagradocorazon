import request from "supertest";
import { beforeEach, describe, expect, test } from "vitest";

import { prisma } from "../src/db.ts";
import { app, bearer, resetDb, signUp } from "./helpers.ts";

beforeEach(resetDb);

describe("consentimiento de analítica (ADR-011)", () => {
  test("empieza desactivado; darlo y retirarlo deja la fecha de cada cambio", async () => {
    const u = await signUp();
    const h = bearer(u.token);
    expect((await request(app).get("/api/me").set(h)).body.data.analyticsConsent).toBe(false);

    await request(app)
      .put("/api/me/onboarding")
      .set(h)
      .send({ patronSaintId: "saint_guadalupe", analyticsConsent: true })
      .expect(200);
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
