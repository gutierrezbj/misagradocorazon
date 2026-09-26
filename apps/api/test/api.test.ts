import request from "supertest";
import { beforeEach, describe, expect, test } from "vitest";

import { prisma } from "../src/db.ts";
import { localDate } from "../src/lib/dates.ts";
import { app, bearer, resetDb, signUp } from "./helpers.ts";

beforeEach(resetDb);

describe("salud y autenticación", () => {
  test("health", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: { status: "ok" }, error: null });
  });

  test("sin sesión, /me devuelve 401", async () => {
    const res = await request(app).get("/api/me");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("unauthenticated");
  });

  test("un token inventado devuelve 401", async () => {
    const res = await request(app).get("/api/me").set(bearer("inventado"));
    expect(res.status).toBe(401);
  });

  test("registro: el usuario nace con rol user aunque intente otro", async () => {
    const { token } = await signUp({ role: "superadmin" });
    const res = await request(app).get("/api/me").set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe("user");
    expect(res.body.data.onboarded).toBe(false);
    expect(res.body.data.streak).toBe(0);
  });

  test("contraseña corta rechazada", async () => {
    const res = await request(app)
      .post("/api/auth/sign-up/email")
      .send({ email: "corta@example.com", password: "1234", name: "X" });
    expect(res.status).toBe(400);
  });

  test("usuario bloqueado recibe 403", async () => {
    const { token, userId } = await signUp();
    await prisma.user.update({ where: { id: userId }, data: { blocked: true } });
    const res = await request(app).get("/api/me").set(bearer(token));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("blocked");
  });
});

describe("onboarding y perfil", () => {
  test("santo inexistente → 400", async () => {
    const { token } = await signUp();
    const res = await request(app).put("/api/me/onboarding").set(bearer(token)).send({ patronSaintId: "saint_nadie" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("invalid_saint");
  });

  test("zona horaria no válida → 400", async () => {
    const { token } = await signUp();
    const res = await request(app)
      .put("/api/me/onboarding")
      .set(bearer(token))
      .send({ patronSaintId: "saint_guadalupe", timezone: "Marte/Olimpo" });
    expect(res.status).toBe(400);
  });

  test("onboarding completo", async () => {
    const { token } = await signUp();
    const res = await request(app)
      .put("/api/me/onboarding")
      .set(bearer(token))
      .send({
        patronSaintId: "saint_guadalupe",
        secondarySaintIds: ["saint_judas", "saint_judas"],
        morningTime: "06:45",
        language: "en",
        timezone: "America/Los_Angeles",
      });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      onboarded: true,
      patronSaintId: "saint_guadalupe",
      secondarySaintIds: ["saint_judas"],
      morningTime: "06:45",
      language: "en",
      timezone: "America/Los_Angeles",
    });
  });

  test("hora con formato incorrecto → 400", async () => {
    const { token } = await signUp();
    const res = await request(app).patch("/api/me").set(bearer(token)).send({ nightTime: "25:00" });
    expect(res.status).toBe(400);
  });
});

describe("santos y contenido diario", () => {
  test("los santos son públicos", async () => {
    const res = await request(app).get("/api/saints");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(7);
    expect(res.body.data[0]).toHaveProperty("history.es");
  });

  test("santo inexistente → 404", async () => {
    const res = await request(app).get("/api/saints/saint_nadie");
    expect(res.status).toBe(404);
  });

  test("sin contenido para la fecha → 404, sin sustituto silencioso", async () => {
    const res = await request(app).get("/api/daily?date=2026-01-01");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("no_content");
  });

  test("contenido del día", async () => {
    await prisma.dailyContent.create({
      data: {
        date: "2026-09-26",
        saintOfDayId: "saint_corazon",
        gospelRef: "Jn 15, 9-17",
        gospelEs: "g",
        gospelEn: "g",
        meditationEs: "m",
        meditationEn: "m",
        morningPrayerEs: "o",
        morningPrayerEn: "o",
        nightPrayerEs: "n",
        nightPrayerEn: "n",
        morningAudioUrlEs: "https://media.example/manana-es.mp3",
        morningAudioUrlEn: "https://media.example/morning-en.mp3",
      },
    });
    const res = await request(app).get("/api/daily?date=2026-09-26");
    expect(res.status).toBe(200);
    expect(res.body.data.saintOfDay.id).toBe("saint_corazon");
    expect(res.body.data.gospel.ref).toBe("Jn 15, 9-17");
    // Audio por idioma (US-07): cada fiel escucha el de su idioma; sin audio, null.
    expect(res.body.data.morningPrayer.audioUrl).toEqual({
      es: "https://media.example/manana-es.mp3",
      en: "https://media.example/morning-en.mp3",
    });
    expect(res.body.data.nightPrayer.audioUrl).toEqual({ es: null, en: null });
  });
});

describe("oraciones y racha", () => {
  test("completar la oración suma racha y es idempotente en el mismo día", async () => {
    const { token } = await signUp();
    const a = await request(app).post("/api/prayers/complete").set(bearer(token)).send({ kind: "morning" });
    const b = await request(app).post("/api/prayers/complete").set(bearer(token)).send({ kind: "morning" });
    const c = await request(app).post("/api/prayers/complete").set(bearer(token)).send({ kind: "night" });
    expect([a.body.data.streak, b.body.data.streak, c.body.data.streak]).toEqual([1, 1, 1]);
  });

  test("racha de días consecutivos", async () => {
    const { token, userId } = await signUp();
    const tz = "America/Mexico_City";
    const ayer = localDate(new Date(Date.now() - 86_400_000), tz);
    const anteayer = localDate(new Date(Date.now() - 2 * 86_400_000), tz);
    await prisma.prayerLog.createMany({
      data: [
        { userId, localDate: ayer, kind: "morning" },
        { userId, localDate: anteayer, kind: "night" },
      ],
    });
    const res = await request(app).post("/api/prayers/complete").set(bearer(token)).send({ kind: "morning" });
    expect(res.body.data.streak).toBe(3);
  });

  test("tipo de oración inválido → 400", async () => {
    const { token } = await signUp();
    const res = await request(app).post("/api/prayers/complete").set(bearer(token)).send({ kind: "siesta" });
    expect(res.status).toBe(400);
  });
});

describe("velas", () => {
  const vela = { saintId: "saint_guadalupe", intention: "Por la salud de mi madre", type: "solemn" };

  test("requiere sesión", async () => {
    const res = await request(app).post("/api/candles").send(vela);
    expect(res.status).toBe(401);
  });

  test("tipo desconocido o intención vacía → 400", async () => {
    const { token } = await signUp();
    const a = await request(app).post("/api/candles").set(bearer(token)).send({ ...vela, type: "gigante" });
    const b = await request(app).post("/api/candles").set(bearer(token)).send({ ...vela, intention: "   " });
    expect([a.status, b.status]).toEqual([400, 400]);
  });

  test("santo inexistente → 404", async () => {
    const { token } = await signUp();
    const res = await request(app).post("/api/candles").set(bearer(token)).send({ ...vela, saintId: "saint_nadie" });
    expect(res.status).toBe(404);
  });

  test("encender una vela: precio, duración, 20 % en el libro e intención cifrada", async () => {
    const { token } = await signUp();
    const res = await request(app).post("/api/candles").set(bearer(token)).send(vela);
    expect(res.status).toBe(201);
    expect(res.body.data.intention).toBe(vela.intention);

    const candle = await prisma.candle.findUniqueOrThrow({ where: { id: res.body.data.id } });
    expect(candle.priceCents).toBe(199);
    expect(candle.paymentProvider).toBe("simulated");
    expect(candle.intentionEncrypted).not.toContain("madre");
    expect(candle.expiresAt.getTime() - candle.litAt.getTime()).toBe(72 * 3_600_000);

    const ledger = await prisma.ledgerEntry.findMany({ where: { candleId: candle.id }, orderBy: { type: "asc" } });
    expect(ledger.map((l) => [l.type, l.amountCents])).toEqual([
      ["purchase", 199],
      ["impact_allocation", 40],
    ]);
  });

  test("mis velas devuelve la intención descifrada solo a su dueño", async () => {
    const a = await signUp();
    const b = await signUp();
    await request(app).post("/api/candles").set(bearer(a.token)).send(vela);
    const mine = await request(app).get("/api/candles/me").set(bearer(a.token));
    const other = await request(app).get("/api/candles/me").set(bearer(b.token));
    expect(mine.body.data).toHaveLength(1);
    expect(mine.body.data[0]).toMatchObject({
      intention: vela.intention,
      active: true,
      priceCents: 199,
      saint: { id: "saint_guadalupe", name: "Virgen de Guadalupe" },
    });
    expect(other.body.data).toHaveLength(0);
  });

  test("el muro de velas no expone intenciones ni usuarios", async () => {
    const { token } = await signUp();
    await request(app).post("/api/candles").set(bearer(token)).send(vela);
    const res = await request(app).get("/api/candles/community");
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ active: 1, last24h: 1, last7d: 1 });
    const raw = JSON.stringify(res.body);
    expect(raw).not.toContain("madre");
    expect(res.body.data.flames[0]).not.toHaveProperty("userId");
    expect(res.body.data.flames[0]).not.toHaveProperty("intentionEncrypted");
  });

  test("el libro de movimientos no admite modificaciones ni borrados", async () => {
    const { token } = await signUp();
    await request(app).post("/api/candles").set(bearer(token)).send(vela);
    const entry = await prisma.ledgerEntry.findFirstOrThrow();
    await expect(prisma.ledgerEntry.update({ where: { id: entry.id }, data: { amountCents: 0 } })).rejects.toThrow();
    await expect(prisma.ledgerEntry.delete({ where: { id: entry.id } })).rejects.toThrow();
  });
});
