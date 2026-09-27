import assert from "node:assert/strict";
import { test } from "node:test";

import { CANDLE_TYPES, impactCents, isVotingOpen } from "./domain.ts";
import { lightCandleSchema, onboardingSchema, profileUpdateSchema } from "./schemas.ts";
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
