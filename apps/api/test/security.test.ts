import request from "supertest";
import { beforeEach, describe, expect, test } from "vitest";

import { createApp } from "../src/app.ts";
import { prisma } from "../src/db.ts";
import { bearer, resetDb, signUp } from "./helpers.ts";

beforeEach(resetDb);

describe("IP del cliente para los límites de login", () => {
  test("una X-Forwarded-For falsificada no cuela: vale la que añade el proxy", async () => {
    const res = await request(createApp())
      .post("/api/auth/sign-up/email")
      .set("X-Forwarded-For", "6.6.6.6, 203.0.113.7")
      .set("X-Msc-Client-Ip", "9.9.9.9")
      .send({ email: `ip${Date.now()}@example.com`, password: "Oracion2026!", name: "Fiel" });
    expect(res.status).toBe(200);
    const session = await prisma.session.findFirstOrThrow({ where: { userId: res.body.user.id } });
    // Sin la corrección, con dos direcciones Better Auth no guardaba ninguna (contador compartido).
    expect(session.ipAddress).toBe("203.0.113.7");
  });
});

describe("cabeceras", () => {
  test("la API no se deja incrustar ni adivinar tipos", async () => {
    const res = await request(createApp()).get("/api/health");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-frame-options"]).toBe("DENY");
    expect(res.headers["referrer-policy"]).toBe("no-referrer");
  });
});

describe("límites de uso", () => {
  test("30 escrituras por minuto y usuario; otro usuario no se ve afectado", async () => {
    const app = createApp({ rateLimits: true });
    const a = await signUp();
    const b = await signUp();
    for (let i = 0; i < 30; i++) {
      const r = await request(app)
        .patch("/api/me")
        .set(bearer(a.token))
        .send({ notifyNight: i % 2 === 0 });
      expect(r.status).toBe(200);
    }
    const blocked = await request(app).patch("/api/me").set(bearer(a.token)).send({ notifyNight: true });
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe("rate_limited");
    // Las lecturas siguen funcionando y el otro fiel puede escribir.
    expect((await request(app).get("/api/me").set(bearer(a.token))).status).toBe(200);
    expect((await request(app).patch("/api/me").set(bearer(b.token)).send({ notifyNight: true })).status).toBe(200);
  });

  test("sin sesión se cuenta por IP: una IP bloqueada no afecta a otra", async () => {
    const app = createApp({ rateLimits: true });
    const post = (ip: string) => request(app).post("/api/intentions").set("X-Forwarded-For", ip).send({ text: "x" });
    for (let i = 0; i < 30; i++) expect((await post("198.51.100.1")).status).toBe(401);
    expect((await post("198.51.100.1")).status).toBe(429);
    expect((await post("198.51.100.2")).status).toBe(401);
  });

  test("el healthcheck del despliegue no cuenta", async () => {
    const app = createApp({ rateLimits: true });
    for (let i = 0; i < 310; i++) expect((await request(app).get("/api/health")).status).toBe(200);
  });
});
