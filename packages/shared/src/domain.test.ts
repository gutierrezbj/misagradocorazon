import assert from "node:assert/strict";
import { test } from "node:test";

import { CANDLE_TYPES, impactCents, isVotingOpen } from "./domain.ts";
import { lightCandleSchema } from "./schemas.ts";

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
