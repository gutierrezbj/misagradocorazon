// SDD-07 / Apple 3.2.2.iv (bloqueante): ninguna pantalla del flujo de compra de la vela,
// incluida la confirmación y la imagen que se comparte, menciona causas, donativos ni el 20%.
import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const PURCHASE_FLOW = ["app/light-candle.tsx", "src/components/ShareCandlePanel.tsx", "src/components/ShareCard.tsx"];
const FORBIDDEN = /caus|20\s?%|20 por ciento|percent|porcentaje|don(a|ó|o)ci|donat|donar|charit|benéfic|benefic|impact|fundaci|foundation|obras/i;

const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

// Diccionario ES/EN de src/i18n.tsx.
const dict = new Map();
for (const m of read("src/i18n.tsx").matchAll(/^\s{2}(\w+): \{\s*es: "((?:[^"\\]|\\.)*)",\s*en: "((?:[^"\\]|\\.)*)",?\s*\},/gm)) {
  dict.set(m[1], [m[2], m[3]]);
}

test("el diccionario se ha leído", () => {
  assert.ok(dict.size > 100, `solo ${dict.size} claves leídas`);
});

for (const file of PURCHASE_FLOW) {
  test(`${file}: sin causas, donativos ni 20%`, () => {
    const code = stripComments(read(file));
    const keys = [...code.matchAll(/\bt\("(\w+)"\)/g)].map((m) => m[1]);
    assert.ok(keys.length > 0, "no usa textos traducidos");
    for (const key of keys) {
      const values = dict.get(key);
      assert.ok(values, `clave i18n desconocida: ${key}`);
      for (const v of values) assert.doesNotMatch(v, FORBIDDEN, `"${key}" = "${v}"`);
    }
    // Literales visibles escritos en el propio componente (p. ej. la marca o el dominio).
    for (const m of code.matchAll(/>\s*([^<>{}\n]*[A-Za-zÁÉÍÓÚáéíóúñ][^<>{}\n]*)\s*</g)) {
      assert.doesNotMatch(m[1], FORBIDDEN, `texto fijo: "${m[1].trim()}"`);
    }
  });
}
