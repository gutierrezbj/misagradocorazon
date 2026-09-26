import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "../src/db.ts";
import { env } from "../src/env.ts";
import { app, bearer, resetDb, signUp, signUpAs } from "./helpers.ts";

beforeEach(resetDb);

const saint = {
  name: "Santa Rosa de Lima",
  feastDate: "08-23",
  imageUrl: "https://media.example/rosa.jpg",
  historyEs: "Primera santa de América.",
  historyEn: "First saint of the Americas.",
};

const daily = {
  gospelRef: "Mt 5, 1-12",
  gospelEs: "Bienaventurados…",
  gospelEn: "Blessed are…",
  meditationEs: "m",
  meditationEn: "m",
  morningPrayerEs: "o",
  morningPrayerEn: "o",
  nightPrayerEs: "n",
  nightPrayerEn: "n",
};

describe("santoral", () => {
  it("solo editores: alta, edición y aparece en la app; queda auditado", async () => {
    const mod = await signUpAs("moderator");
    expect((await request(app).post("/api/admin/saints").set(bearer(mod.token)).send(saint)).status).toBe(403);

    const ed = await signUpAs("editor");
    const created = await request(app).post("/api/admin/saints").set(bearer(ed.token)).send({ ...saint, isPatronCatalog: true });
    expect(created.status).toBe(201);
    expect(created.body.data.id).toBe("saint_santa_rosa_de_lima");

    const again = await request(app).post("/api/admin/saints").set(bearer(ed.token)).send(saint);
    expect(again.body.data.id).toBe("saint_santa_rosa_de_lima_2");

    const patched = await request(app)
      .patch("/api/admin/saints/saint_santa_rosa_de_lima")
      .set(bearer(ed.token))
      .send({ audioUrlEs: "https://media.example/rosa-es.mp3" });
    expect(patched.status).toBe(200);

    const pub = await request(app).get("/api/saints/saint_santa_rosa_de_lima");
    expect(pub.body.data.audioUrl).toEqual({ es: "https://media.example/rosa-es.mp3", en: null });
    expect(await prisma.adminAuditLog.count({ where: { entity: "saint", entityId: "saint_santa_rosa_de_lima" } })).toBe(2);
  });

  it("valida fecha y URLs", async () => {
    const ed = await signUpAs("editor");
    expect((await request(app).post("/api/admin/saints").set(bearer(ed.token)).send({ ...saint, feastDate: "13-40" })).status).toBe(400);
    expect((await request(app).post("/api/admin/saints").set(bearer(ed.token)).send({ ...saint, imageUrl: "javascript:alert(1)" })).status).toBe(400);
  });

  it("no da de baja un santo en uso; la baja lo oculta y se puede deshacer", async () => {
    const ed = await signUpAs("editor");
    const fiel = await signUp();
    await prisma.user.update({ where: { id: fiel.userId }, data: { patronSaintId: "saint_guadalupe" } });
    const blocked = await request(app).delete("/api/admin/saints/saint_guadalupe").set(bearer(ed.token));
    expect(blocked.status).toBe(409);
    expect(blocked.body.error.code).toBe("saint_in_use");

    const del = await request(app).delete("/api/admin/saints/saint_teresa").set(bearer(ed.token));
    expect(del.status).toBe(200);
    expect((await request(app).get("/api/saints/saint_teresa")).status).toBe(404);
    await request(app).post("/api/admin/saints/saint_teresa/restore").set(bearer(ed.token)).expect(200);
    expect((await request(app).get("/api/saints/saint_teresa")).status).toBe(200);
  });
});

describe("contenido diario", () => {
  it("crea y edita el día; la app lo sirve con audio por idioma", async () => {
    const ed = await signUpAs("editor");
    const put = await request(app)
      .put("/api/admin/daily/2026-12-12")
      .set(bearer(ed.token))
      .send({ ...daily, saintOfDayId: "saint_guadalupe", morningAudioUrlEs: "https://media.example/m-es.mp3" });
    expect(put.status).toBe(200);
    const upd = await request(app).put("/api/admin/daily/2026-12-12").set(bearer(ed.token)).send({ ...daily, gospelRef: "Lc 1, 39-48" });
    expect(upd.status).toBe(200);

    const pub = await request(app).get("/api/daily?date=2026-12-12");
    expect(pub.body.data.gospel.ref).toBe("Lc 1, 39-48");
    expect(pub.body.data.saintOfDay.id).toBe("saint_guadalupe");
    expect(pub.body.data.morningPrayer.audioUrl).toEqual({ es: "https://media.example/m-es.mp3", en: null });
    const actions = await prisma.adminAuditLog.findMany({ where: { entity: "daily_content" }, orderBy: { createdAt: "asc" } });
    expect(actions.map((a) => a.action)).toEqual(["daily.create", "daily.update"]);
  });

  it("el calendario marca los días listos y los huecos", async () => {
    const ed = await signUpAs("editor");
    await request(app).put("/api/admin/daily/2026-12-02").set(bearer(ed.token)).send({ ...daily, nightAudioUrlEn: "https://media.example/n-en.mp3" });
    const cal = await request(app).get("/api/admin/daily?from=2026-12-01&days=3").set(bearer(ed.token));
    expect(cal.body.data.map((d: { date: string; filled: boolean }) => [d.date, d.filled])).toEqual([
      ["2026-12-01", false],
      ["2026-12-02", true],
      ["2026-12-03", false],
    ]);
    expect(cal.body.data[1].audio.night).toEqual({ es: false, en: true });
  });

  it("rechaza santos dados de baja, fechas inválidas y textos vacíos", async () => {
    const ed = await signUpAs("editor");
    await prisma.saint.update({ where: { id: "saint_teresa" }, data: { deletedAt: new Date() } });
    expect((await request(app).put("/api/admin/daily/2026-12-01").set(bearer(ed.token)).send({ ...daily, saintOfDayId: "saint_teresa" })).status).toBe(400);
    expect((await request(app).put("/api/admin/daily/2026-13-01").set(bearer(ed.token)).send(daily)).status).toBe(400);
    expect((await request(app).put("/api/admin/daily/2026-12-01").set(bearer(ed.token)).send({ ...daily, gospelEs: "" })).status).toBe(400);
  });
});

describe("subidas a R2", () => {
  const saved = { ...env };
  afterEach(() => Object.assign(env, saved));

  it("sin R2 configurado responde 503 y el panel puede pegar URLs", async () => {
    const ed = await signUpAs("editor");
    const res = await request(app).post("/api/admin/uploads").set(bearer(ed.token)).send({ kind: "audio", contentType: "audio/mpeg", size: 1000 });
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe("storage_not_configured");
  });

  it("firma una subida con tipo y tamaño fijados y devuelve la URL pública", async () => {
    Object.assign(env, {
      R2_ACCOUNT_ID: "acct123",
      R2_ACCESS_KEY_ID: "AKIATEST",
      R2_SECRET_ACCESS_KEY: "secret",
      R2_BUCKET: "msc-media",
      R2_PUBLIC_BASE_URL: "https://media.misagradocorazon.test/",
    });
    const ed = await signUpAs("editor");
    const res = await request(app).post("/api/admin/uploads").set(bearer(ed.token)).send({ kind: "audio", contentType: "audio/mpeg", size: 1234 });
    expect(res.status).toBe(201);
    const url = new URL(res.body.data.uploadUrl);
    expect(url.host).toBe("acct123.r2.cloudflarestorage.com");
    expect(url.pathname).toMatch(/^\/msc-media\/audio\/\d{4}-\d{2}\/[0-9a-f-]{36}\.mp3$/);
    expect(url.searchParams.get("X-Amz-Expires")).toBe("600");
    expect(url.searchParams.get("X-Amz-SignedHeaders")).toContain("content-length");
    expect(url.searchParams.get("X-Amz-SignedHeaders")).toContain("content-type");
    expect(res.body.data.publicUrl).toBe(`https://media.misagradocorazon.test/${res.body.data.key}`);
  });

  it("rechaza tipos y tamaños no admitidos", async () => {
    const ed = await signUpAs("editor");
    const exe = await request(app).post("/api/admin/uploads").set(bearer(ed.token)).send({ kind: "image", contentType: "application/x-msdownload", size: 10 });
    expect(exe.status).toBe(400);
    const big = await request(app).post("/api/admin/uploads").set(bearer(ed.token)).send({ kind: "image", contentType: "image/jpeg", size: 6 * 1024 * 1024 });
    expect(big.status).toBe(400);
  });
});
