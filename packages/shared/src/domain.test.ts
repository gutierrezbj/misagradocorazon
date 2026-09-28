import assert from "node:assert/strict";
import { test } from "node:test";

import { budgetTotalCents, CANDLE_TYPES, easterSunday, impactCents, isVotingOpen, liturgicalSeason } from "./domain.ts";
import { causeInputSchema, causeUpdateSchema, dailyContentInputSchema, lightCandleSchema, massUpdateSchema, onboardingSchema, profileUpdateSchema, saintUpdateSchema } from "./schemas.ts";
import { scrubEvent } from "./sentry.ts";

test("el 20 % de cada tier de vela se calcula en céntimos", () => {
  assert.equal(impactCents(CANDLE_TYPES.basic.priceCents), 20);
  assert.equal(impactCents(CANDLE_TYPES.solemn.priceCents), 40);
  assert.equal(impactCents(CANDLE_TYPES.permanent.priceCents), 60);
});

test("la votación solo está abierta del día 1 al 7", () => {
  assert.equal(isVotingOpen(new Date(Date.UTC(2026, 11, 1))), true);
  assert.equal(isVotingOpen(new Date(Date.UTC(2026, 11, 7, 23, 59))), true);
  assert.equal(isVotingOpen(new Date(Date.UTC(2026, 11, 8))), false);
});

test("una vela sin intención no es válida", () => {
  const r = lightCandleSchema.safeParse({ saintId: "s1", intention: "   ", type: "basic" });
  assert.equal(r.success, false);
});

test("un tipo de vela desconocido no es válido", () => {
  const r = lightCandleSchema.safeParse({ saintId: "s1", intention: "Por mi madre", type: "gigante" });
  assert.equal(r.success, false);
});

// Regresión (27-sep-2026): PATCH /me con un solo campo reescribía idioma, horarios y santos
// secundarios con los valores por defecto del onboarding.
test("profileUpdateSchema no rellena valores por defecto", () => {
  assert.deepEqual(profileUpdateSchema.parse({ notifyNight: false }), { notifyNight: false });
  assert.deepEqual(profileUpdateSchema.parse({}), {});
});

test("onboardingSchema sí aplica los valores por defecto del alta", () => {
  const v = onboardingSchema.parse({ patronSaintId: "saint_guadalupe" });
  assert.equal(v.language, "es");
  assert.equal(v.morningTime, "07:30");
  assert.deepEqual(v.secondarySaintIds, []);
});

test("scrubEvent: ningún dato personal ni intención sale en un error", () => {
  const ev = scrubEvent({
    request: {
      url: "https://api.misagradocorazon.com/api/candles?email=x@y.com",
      data: '{"intention":"Por la salud de mi madre"}',
      cookies: "a=b",
      headers: { authorization: "Bearer secreto", "user-agent": "okhttp" },
      query_string: "email=x@y.com",
    },
    user: { id: "u1", email: "x@y.com", ip_address: "1.2.3.4" },
    breadcrumbs: [
      { category: "console", message: "Por la salud de mi madre" },
      { category: "ui.click", message: "Encender vela" },
      { category: "fetch", data: { url: "https://api/x?token=abc", method: "POST", status_code: 500, body: "Por la salud" } },
      { category: "navigation", data: { from: "/", to: "/light-candle" } },
    ],
    extra: { intention: "Por la salud de mi madre" },
  });
  const raw = JSON.stringify(ev);
  for (const bad of ["salud", "x@y.com", "1.2.3.4", "secreto", "u1", "a=b", "token=abc", "Encender vela"]) assert.ok(!raw.includes(bad), bad);
  assert.deepEqual(ev.user, { ip_address: null });
  assert.deepEqual(ev.request?.headers, { "user-agent": "okhttp" });
  assert.equal(ev.request?.url, "https://api.misagradocorazon.com/api/candles");
  assert.equal(ev.breadcrumbs?.length, 2);
  assert.deepEqual(ev.breadcrumbs?.[0]?.data, { url: "https://api/x", method: "POST", status_code: 500 });
});

// Regresión (27-sep-2026): editar una misa, una causa o un santo con un solo campo rellenaba los
// demás con su valor por defecto (duración 120, sin fotos, oración vacía...).
test("los esquemas de edición no inventan campos que no llegan", () => {
  assert.deepEqual(massUpdateSchema.parse({ recordingUrl: "https://youtu.be/abcdefghijk" }), { recordingUrl: "https://youtu.be/abcdefghijk" });
  assert.deepEqual(massUpdateSchema.parse({ recordingUrl: null }), { recordingUrl: null });
  assert.deepEqual(causeUpdateSchema.parse({ nameEs: "Pozo" }), { nameEs: "Pozo" });
  assert.deepEqual(saintUpdateSchema.parse({ name: "San José" }), { name: "San José" });
  // Las reglas de cada campo se mantienen.
  assert.equal(massUpdateSchema.safeParse({ durationMin: 5 }).success, false);
  assert.equal(saintUpdateSchema.safeParse({ sortOrder: -1 }).success, false);
});

// US-10: oraciones según el tiempo litúrgico. Fechas de Pascua conocidas y límites de cada tiempo.
test("el domingo de Pascua cae en su fecha", () => {
  const easter = (y: number) => new Date(easterSunday(y)).toISOString().slice(0, 10);
  assert.equal(easter(2008), "2008-03-23");
  assert.equal(easter(2024), "2024-03-31");
  assert.equal(easter(2025), "2025-04-20");
  assert.equal(easter(2026), "2026-04-05");
  assert.equal(easter(2027), "2027-03-28");
  assert.equal(easter(2038), "2038-04-25");
});

test("cada día cae en su tiempo litúrgico, límites incluidos", () => {
  const cases: [string, string][] = [
    ["2026-01-11", "christmas"], // Bautismo del Señor
    ["2026-01-12", "ordinary"],
    ["2026-02-17", "ordinary"],
    ["2026-02-18", "lent"], // Miércoles de Ceniza
    ["2026-04-04", "lent"], // Sábado Santo
    ["2026-04-05", "easter"],
    ["2026-05-24", "easter"], // Pentecostés
    ["2026-05-25", "ordinary"],
    ["2026-11-28", "ordinary"],
    ["2026-11-29", "advent"], // Primer domingo de Adviento
    ["2026-12-24", "advent"],
    ["2026-12-25", "christmas"],
    ["2027-01-10", "christmas"],
    ["2027-01-11", "ordinary"],
    ["2028-12-03", "advent"], // el 3-dic es el último día posible de inicio
    ["2028-12-02", "ordinary"],
    ["2019-01-13", "christmas"], // 6-ene en domingo: Bautismo el 13
    ["2019-01-14", "ordinary"],
  ];
  for (const [date, season] of cases) assert.equal(liturgicalSeason(date), season, date);
});

test("la oración del día es opcional, pero en los dos idiomas o en ninguno", () => {
  const base = { gospelRef: "Jn 1", gospelEs: "g", gospelEn: "g", meditationEs: "m", meditationEn: "m" };
  const empty = dailyContentInputSchema.parse({ ...base, morningPrayerEs: "", morningPrayerEn: "  " });
  assert.equal(empty.morningPrayerEs, null);
  assert.equal(empty.nightPrayerEn, null);
  assert.equal(dailyContentInputSchema.safeParse({ ...base, morningPrayerEs: "Señor", morningPrayerEn: "" }).success, false);
  assert.equal(dailyContentInputSchema.safeParse({ ...base, nightAudioUrlEs: "https://cdn.example.com/a.mp3" }).success, false);
  assert.equal(dailyContentInputSchema.safeParse({ ...base, nightPrayerEs: "Señor", nightPrayerEn: "Lord" }).success, true);
});

// Ficha de causa: presupuesto desglosado; el total es la suma de las partidas.
test("una causa necesita destino del dinero y al menos una partida; el total es la suma", () => {
  const base = {
    month: "2026-11",
    nameEs: "Pozo",
    nameEn: "Well",
    location: "Oaxaca",
    responsible: "Parroquia",
    descriptionEs: "d",
    descriptionEn: "d",
    fundsUseEs: "Perforar y equipar el pozo",
    fundsUseEn: "Drill and equip the well",
    timeline: "3 meses",
  };
  const items = [
    { conceptEs: "Perforación", conceptEn: "Drilling", amountCents: 600_000 },
    { conceptEs: "Bomba", conceptEn: "Pump", amountCents: 250_050 },
  ];
  assert.equal(causeInputSchema.safeParse({ ...base, budgetItems: items }).success, true);
  assert.equal(causeInputSchema.safeParse({ ...base, budgetItems: [] }).success, false);
  assert.equal(causeInputSchema.safeParse({ ...base, fundsUseEs: " ", budgetItems: items }).success, false);
  assert.equal(causeInputSchema.safeParse({ ...base, budgetItems: [{ ...items[0], amountCents: 0 }] }).success, false);
  assert.equal(budgetTotalCents(items), 850_050);
});
