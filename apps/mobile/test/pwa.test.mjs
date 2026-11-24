// Beta web instalable (SDD-05 US-27, ADR-016) y marca propia (CLAUDE.md: nada del constructor).
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const at = (p) => new URL(`../${p}`, import.meta.url);
const read = (p) => readFileSync(at(p), "utf8");

test("el manifiesto hace la app instalable y sus iconos existen", () => {
  const m = JSON.parse(read("public/manifest.webmanifest"));
  assert.equal(m.name, "Mi Sagrado Corazón");
  assert.equal(m.display, "standalone");
  assert.ok(m.start_url.startsWith("/"));
  const sizes = m.icons.map((i) => i.sizes);
  assert.ok(sizes.includes("192x192") && sizes.includes("512x512"), "faltan los iconos de 192 y 512");
  assert.ok(
    m.icons.some((i) => i.purpose === "maskable"),
    "falta el icono maskable",
  );
  for (const i of m.icons) assert.ok(existsSync(at(`public${i.src}`)), `no existe ${i.src}`);
});

test("la página enlaza el manifiesto y registra el service worker sin scripts en línea (CSP)", () => {
  const html = read("public/index.html");
  assert.match(html, /<link rel="manifest" href="\/manifest.webmanifest"/);
  assert.match(html, /<script src="\/register-sw.js"/);
  assert.doesNotMatch(html, /<script>(?!\s*<\/script>)/, "script en línea: la CSP lo bloquearía");
  assert.match(read("public/register-sw.js"), /register\("\/sw.js"\)/);
});

test("el service worker nunca guarda la API", () => {
  const sw = read("public/sw.js");
  assert.match(sw, /url.origin !== self.location.origin\) return/);
  assert.doesNotMatch(sw, /\/api\//);
});

// Huellas del icono, el favicon y la pantalla de arranque que traía la entrega del constructor.
const CONSTRUCTOR_ASSETS = new Set([
  "1d5f9e9f69ee62a572d48a9537fbc8844d52c8b3f8297ee54a6d19b7ace9495d",
  "2800a149cb4d3c1507b82bdc82ed8f2ce09678585ed279f63ca1ffdc91572722",
  "38240320cf730bf9164ef0744cf2a428c827c0312c0c42a057ac3a4b7de0aafd",
]);

test("ni la app ni la web llevan la marca del constructor", () => {
  const { expo } = JSON.parse(read("app.json"));
  const files = [
    expo.icon,
    expo.android.adaptiveIcon.foregroundImage,
    expo.web.favicon,
    expo.plugins.find((p) => Array.isArray(p) && p[0] === "expo-splash-screen")[1].image,
    "./public/apple-touch-icon.png",
    "./public/icons/icon-512.png",
  ];
  for (const f of files) {
    const hash = createHash("sha256")
      .update(readFileSync(at(f)))
      .digest("hex");
    assert.ok(!CONSTRUCTOR_ASSETS.has(hash), `${f} es la imagen del constructor`);
  }
});
