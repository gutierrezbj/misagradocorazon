import request from "supertest";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { prisma } from "../src/db.ts";
import { computeDay, refreshKpiDaily } from "../src/modules/kpis/kpi-daily.ts";
import { app, bearer, resetDb, signUp, signUpAs } from "./helpers.ts";

beforeEach(resetDb);
afterEach(() => vi.useRealTimers());

const AT = new Date("2026-09-20T10:00:00Z");

// Actividad creada por la API con el reloj en el 20-sep, para trabajar con días cerrados.
// (El libro de movimientos no admite cambiar fechas después: es de solo inserción.)
async function activityOn20Sep() {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(AT);
  const editor = await signUpAs("editor");
  const a = await signUp();
  const b = await signUp();
  await request(app).post("/api/candles").set(bearer(a.token)).send({ saintId: "saint_guadalupe", intention: "x", type: "basic" }).expect(201);
  await request(app).post("/api/prayers/complete").set(bearer(b.token)).send({ kind: "morning" });
  await request(app).post("/api/prayers/complete").set(bearer(editor.token)).send({ kind: "morning" });
  vi.useRealTimers();
  return { editor, a, b };
}

describe("agregados diarios (kpi_daily)", () => {
  test("un día cerrado: fieles, actividad, velas y dinero salen de las tablas de origen; el staff no cuenta", async () => {
    await activityOn20Sep();
    expect(await computeDay("2026-09-20")).toEqual({
      day: "2026-09-20",
      newUsers: 2,
      activeUsers: 2,
      prayers: 1,
      candles: 1,
      buyers: 1,
      revenueCents: 99,
      impactCents: 20,
      votes: 0,
      chatMessages: 0,
      massAttendees: 0,
    });
    expect(await computeDay("2026-09-21")).toMatchObject({ newUsers: 0, activeUsers: 0, candles: 0, revenueCents: 0 });
  });

  test("el job rellena desde el primer registro hasta ayer y después solo recalcula los últimos días", async () => {
    await activityOn20Sep();
    const now = new Date("2026-09-25T01:00:00Z");
    expect(await refreshKpiDaily(now)).toEqual({ days: 5 });
    const rows = await prisma.kpiDaily.findMany({ orderBy: { day: "asc" } });
    expect(rows.map((r) => r.day)).toEqual(["2026-09-20", "2026-09-21", "2026-09-22", "2026-09-23", "2026-09-24"]);
    expect(rows[0]).toMatchObject({ candles: 1, revenueCents: 99 });

    expect(await refreshKpiDaily(now)).toEqual({ days: 3 });
    // Una escritura tardía en un día reciente se recoge al recalcular.
    await prisma.candle.updateMany({ data: { litAt: new Date("2026-09-24T12:00:00Z") } });
    await refreshKpiDaily(now);
    expect(await prisma.kpiDaily.findUniqueOrThrow({ where: { day: "2026-09-24" } })).toMatchObject({ candles: 1 });
  });

  test("el panel recibe la serie de la ventana con hoy en vivo, y rellena los días que falten", async () => {
    const editor = await signUpAs("editor");
    const u = await signUp();
    await request(app).post("/api/candles").set(bearer(u.token)).send({ saintId: "saint_guadalupe", intention: "x", type: "solemn" }).expect(201);

    const res = await request(app).get("/api/admin/kpis?days=7").set(bearer(editor.token));
    const daily = res.body.data.daily as { day: string; candles: number; activeUsers: number; revenueCents: number }[];
    expect(daily).toHaveLength(8);
    expect(daily.at(-1)).toMatchObject({ day: new Date().toISOString().slice(0, 10), candles: 1, activeUsers: 1, revenueCents: 199 });
    expect(res.body.data.candles.byDay.at(-1).candles).toBe(1);
    // Los 7 días cerrados quedan guardados; hoy no.
    expect(await prisma.kpiDaily.count()).toBe(7);
  });
});
