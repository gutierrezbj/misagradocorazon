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
    const created = await request(app)
      .post("/api/admin/saints")
      .set(bearer(ed.token))
      .send({ ...saint, isPatronCatalog: true, prayerEs: "Santa Rosa, ruega por nosotros.", sortOrder: 7 });
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
    // Solo cambia lo enviado: el resto de la ficha sigue igual (regresión del 27-sep-2026).
    const stored = await prisma.saint.findUniqueOrThrow({ where: { id: "saint_santa_rosa_de_lima" } });
    expect(stored).toMatchObject({ isPatronCatalog: true, prayerEs: "Santa Rosa, ruega por nosotros.", sortOrder: 7 });
    expect(await prisma.adminAuditLog.count({ where: { entity: "saint", entityId: "saint_santa_rosa_de_lima" } })).toBe(2);
  });

  it("iconografía opcional (US-26): se guarda, se sirve en la ficha y editarla no toca lo demás", async () => {
    const ed = await signUpAs("editor");
    const created = await request(app).post("/api/admin/saints").set(bearer(ed.token)).send(saint);
    expect((await request(app).get(`/api/saints/${created.body.data.id}`)).body.data.iconography).toEqual({ es: "", en: "" });

    await request(app)
      .patch(`/api/admin/saints/${created.body.data.id}`)
      .set(bearer(ed.token))
      .send({ iconographyEs: "Hábito dominico y corona de rosas", iconographyEn: "Dominican habit and a crown of roses" })
      .expect(200);
    const pub = (await request(app).get(`/api/saints/${created.body.data.id}`)).body.data;
    expect(pub.iconography).toEqual({ es: "Hábito dominico y corona de rosas", en: "Dominican habit and a crown of roses" });
    expect(pub.history.es).toBe(saint.historyEs);
    expect(
      (
        await request(app)
          .patch(`/api/admin/saints/${created.body.data.id}`)
          .set(bearer(ed.token))
          .send({ iconographyEs: "x".repeat(1001) })
      ).status,
    ).toBe(400);
  });

  it("valida fecha y URLs", async () => {
    const ed = await signUpAs("editor");
    expect(
      (
        await request(app)
          .post("/api/admin/saints")
          .set(bearer(ed.token))
          .send({ ...saint, feastDate: "13-40" })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .post("/api/admin/saints")
          .set(bearer(ed.token))
          .send({ ...saint, imageUrl: "javascript:alert(1)" })
      ).status,
    ).toBe(400);
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
    const upd = await request(app)
      .put("/api/admin/daily/2026-12-12")
      .set(bearer(ed.token))
      .send({ ...daily, gospelRef: "Lc 1, 39-48" });
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
    await request(app)
      .put("/api/admin/daily/2026-12-02")
      .set(bearer(ed.token))
      .send({ ...daily, nightAudioUrlEn: "https://media.example/n-en.mp3" });
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
    expect(
      (
        await request(app)
          .put("/api/admin/daily/2026-12-01")
          .set(bearer(ed.token))
          .send({ ...daily, saintOfDayId: "saint_teresa" })
      ).status,
    ).toBe(400);
    expect((await request(app).put("/api/admin/daily/2026-13-01").set(bearer(ed.token)).send(daily)).status).toBe(400);
    expect(
      (
        await request(app)
          .put("/api/admin/daily/2026-12-01")
          .set(bearer(ed.token))
          .send({ ...daily, gospelEs: "" })
      ).status,
    ).toBe(400);
  });
});

describe("oraciones por tiempo litúrgico (US-10)", () => {
  const bare = { gospelRef: "Mt 5, 1-12", gospelEs: "g", gospelEn: "g", meditationEs: "m", meditationEn: "m" };
  const set = (textEs: string, audioUrlEs?: string) => ({ textEs, textEn: `${textEs} (en)`, ...(audioUrlEs && { audioUrlEs }) });

  it("un día sin oración propia sirve la de su tiempo, con su audio; sin set del tiempo, la del ordinario", async () => {
    const ed = await signUpAs("editor");
    await request(app)
      .put("/api/admin/seasonal-prayers/advent/morning")
      .set(bearer(ed.token))
      .send(set("Ven, Señor Jesús", "https://media.example/adv-es.mp3"))
      .expect(200);
    await request(app).put("/api/admin/seasonal-prayers/ordinary/morning").set(bearer(ed.token)).send(set("Buenos días, Señor")).expect(200);
    await request(app).put("/api/admin/seasonal-prayers/ordinary/night").set(bearer(ed.token)).send(set("Buenas noches, Señor")).expect(200);
    for (const date of ["2026-12-01", "2026-12-26", "2026-10-01"]) {
      await request(app).put(`/api/admin/daily/${date}`).set(bearer(ed.token)).send(bare).expect(200);
    }

    const advent = (await request(app).get("/api/daily?date=2026-12-01")).body.data;
    expect(advent.season).toBe("advent");
    expect(advent.morningPrayer).toEqual({
      es: "Ven, Señor Jesús",
      en: "Ven, Señor Jesús (en)",
      audioUrl: { es: "https://media.example/adv-es.mp3", en: null },
      source: "season",
    });
    // Adviento no tiene oración de noche: se usa la del tiempo ordinario.
    expect(advent.nightPrayer.es).toBe("Buenas noches, Señor");

    const christmas = (await request(app).get("/api/daily?date=2026-12-26")).body.data;
    expect(christmas.season).toBe("christmas");
    expect(christmas.morningPrayer.es).toBe("Buenos días, Señor");
    expect((await request(app).get("/api/daily?date=2026-10-01")).body.data.season).toBe("ordinary");
  });

  it("la oración propia del día manda sobre la del tiempo, con su propio audio", async () => {
    const ed = await signUpAs("editor");
    await request(app)
      .put("/api/admin/seasonal-prayers/advent/night")
      .set(bearer(ed.token))
      .send(set("Maranatha", "https://media.example/adv.mp3"))
      .expect(200);
    await request(app)
      .put("/api/admin/daily/2026-12-08")
      .set(bearer(ed.token))
      .send({ ...bare, nightPrayerEs: "Inmaculada", nightPrayerEn: "Immaculate" })
      .expect(200);
    const day = (await request(app).get("/api/daily?date=2026-12-08")).body.data;
    expect(day.nightPrayer).toEqual({ es: "Inmaculada", en: "Immaculate", audioUrl: { es: null, en: null }, source: "day" });
  });

  it("sin oración propia ni sets, la oración llega vacía en vez de romper", async () => {
    const ed = await signUpAs("editor");
    await request(app).put("/api/admin/daily/2026-10-02").set(bearer(ed.token)).send(bare).expect(200);
    const day = (await request(app).get("/api/daily?date=2026-10-02")).body.data;
    expect(day.morningPrayer).toBeNull();
    expect(day.nightPrayer).toBeNull();
  });

  it("el calendario del panel dice el tiempo de cada día y de dónde sale la oración", async () => {
    const ed = await signUpAs("editor");
    await request(app).put("/api/admin/seasonal-prayers/advent/morning").set(bearer(ed.token)).send(set("Ven", "https://media.example/a.mp3")).expect(200);
    await request(app)
      .put("/api/admin/daily/2026-11-29")
      .set(bearer(ed.token))
      .send({ ...bare, nightPrayerEs: "n", nightPrayerEn: "n" })
      .expect(200);
    const cal = (await request(app).get("/api/admin/daily?from=2026-11-28&days=2").set(bearer(ed.token))).body.data;
    expect(cal[0]).toMatchObject({ date: "2026-11-28", season: "ordinary", filled: false });
    expect(cal[1]).toMatchObject({
      date: "2026-11-29",
      season: "advent",
      prayers: { morning: "season", night: "day" },
      audio: { morning: { es: true, en: false }, night: { es: false, en: false } },
    });
  });

  it("solo editores; valida tiempo, tipo y textos; queda auditado", async () => {
    const mod = await signUpAs("moderator");
    expect((await request(app).get("/api/admin/seasonal-prayers").set(bearer(mod.token))).status).toBe(403);
    expect((await request(app).put("/api/admin/seasonal-prayers/lent/morning").set(bearer(mod.token)).send(set("x"))).status).toBe(403);

    const ed = await signUpAs("editor");
    expect((await request(app).put("/api/admin/seasonal-prayers/pentecost/morning").set(bearer(ed.token)).send(set("x"))).status).toBe(400);
    expect((await request(app).put("/api/admin/seasonal-prayers/lent/noon").set(bearer(ed.token)).send(set("x"))).status).toBe(400);
    expect((await request(app).put("/api/admin/seasonal-prayers/lent/morning").set(bearer(ed.token)).send({ textEs: "x" })).status).toBe(400);
    expect(
      (
        await request(app)
          .put("/api/admin/seasonal-prayers/lent/morning")
          .set(bearer(ed.token))
          .send({ ...set("x"), audioUrlEs: "javascript:alert(1)" })
      ).status,
    ).toBe(400);

    await request(app).put("/api/admin/seasonal-prayers/lent/morning").set(bearer(ed.token)).send(set("Misericordia")).expect(200);
    await request(app).put("/api/admin/seasonal-prayers/lent/morning").set(bearer(ed.token)).send(set("Perdón")).expect(200);
    const list = (await request(app).get("/api/admin/seasonal-prayers").set(bearer(ed.token))).body.data;
    expect(list.map((s: { season: string }) => s.season)).toEqual(["advent", "christmas", "lent", "easter", "ordinary"]);
    expect(list[2].morning.textEs).toBe("Perdón");
    expect(list[2].night).toBeNull();
    const log = await prisma.adminAuditLog.findMany({ where: { entity: "seasonal_prayer" } });
    expect(log.map((l) => [l.action, l.entityId])).toEqual([
      ["seasonal_prayer.update", "lent:morning"],
      ["seasonal_prayer.update", "lent:morning"],
    ]);
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
    const big = await request(app)
      .post("/api/admin/uploads")
      .set(bearer(ed.token))
      .send({ kind: "image", contentType: "image/jpeg", size: 6 * 1024 * 1024 });
    expect(big.status).toBe(400);
  });
});
