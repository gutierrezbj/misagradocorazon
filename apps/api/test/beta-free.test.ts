// Beta abierta (SDD-05 US-28 y US-29, aprobado el 23-nov-2026): la vela es gratis, no entra nada en
// el libro de movimientos y la transparencia no enseña dinero que no existe. Las velas sí cuentan en los KPIs.
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

import { prisma } from "../src/db.ts";
import { betaFreePayments, payments, setPaymentProvider, simulatedPayments } from "../src/modules/payments/provider.ts";
import { app, bearer, resetDb, signUp, signUpAs } from "./helpers.ts";

const vela = { saintId: "saint_guadalupe", intention: "Por la salud de mi madre", type: "permanent" };

beforeEach(resetDb);
beforeAll(() => setPaymentProvider(betaFreePayments));
afterAll(() => setPaymentProvider(simulatedPayments));

describe("vela gratis durante la beta", () => {
  test("se enciende a precio 0, con su duración y sin movimientos en el libro", async () => {
    expect(payments().name).toBe("beta_free");
    const { token } = await signUp();
    const res = await request(app).post("/api/candles").set(bearer(token)).send(vela);
    expect(res.status).toBe(201);

    const candle = await prisma.candle.findUniqueOrThrow({ where: { id: res.body.data.id } });
    expect(candle.priceCents).toBe(0);
    expect(candle.paymentProvider).toBe("beta_free");
    expect(candle.paymentRef).toMatch(/^beta_/);
    expect(candle.expiresAt.getTime() - candle.litAt.getTime()).toBe(7 * 24 * 3_600_000);
    expect(await prisma.ledgerEntry.count()).toBe(0);
  });

  test("la app sabe que la vela es gratis", async () => {
    const res = await request(app).get("/api/features");
    expect(res.body.data.candlesFree).toBe(true);
  });

  test("la transparencia dice que es beta y no muestra recaudación", async () => {
    const { token } = await signUp();
    await request(app).post("/api/candles").set(bearer(token)).send(vela);
    const res = await request(app).get("/api/transparency");
    expect(res.status).toBe(200);
    expect(res.body.data.beta).toBe(true);
    expect(res.body.data.totals).toEqual({ revenueCents: 0, impactCents: 0, transferredCents: 0 });
  });

  test("los KPIs cuentan las velas de la beta, pero no como ingresos", async () => {
    const fiel = await signUp();
    await request(app).post("/api/candles").set(bearer(fiel.token)).send(vela);
    const admin = await signUpAs("superadmin");
    const res = await request(app).get("/api/admin/kpis").set(bearer(admin.token));
    expect(res.status).toBe(200);
    expect(res.body.data.candles.total).toBe(1);
    expect(res.body.data.money.revenueCents).toBe(0);
  });
});
