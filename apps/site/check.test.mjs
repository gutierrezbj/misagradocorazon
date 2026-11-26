// Comprobaciones de la web pública antes de publicar (docs/web-publica.md, apartado 7).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const pub = (p) => fileURLToPath(new URL("./public/" + p.replace(/^\//, ""), import.meta.url));
const html = readFileSync(pub("index.html"), "utf8");
const css = readFileSync(pub("styles.css"), "utf8");
const js = readFileSync(pub("main.js"), "utf8");

test('un solo h1 y lang="es"', () => {
  assert.equal((html.match(/<h1[\s>]/g) || []).length, 1);
  assert.match(html, /<html lang="es">/);
});

test("título < 60 y descripción < 155 caracteres", () => {
  const title = html.match(/<title>([^<]+)<\/title>/)[1];
  const desc = html.match(/<meta\s+name="description"\s+content="([^"]+)"/)[1];
  assert.ok(title.length < 60, `título de ${title.length}`);
  assert.ok(desc.length < 155, `descripción de ${desc.length}`);
});

test("schema.org con Organization y WebSite", () => {
  const ld = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]+?)<\/script>/)[1]);
  const types = ld["@graph"].map((n) => n["@type"]);
  assert.deepEqual(types.sort(), ["Organization", "WebSite"]);
});

test("sin unidades vh en la página", () => {
  for (const [name, src] of [
    ["styles.css", css],
    ["index.html", html],
    ["main.js", js],
  ]) {
    assert.doesNotMatch(src, /\d(s|d|l)?vh\b/, `${name} usa vh`);
  }
});

test("sin recursos de terceros: tipografías y scripts autoalojados", () => {
  assert.doesNotMatch(html + css, /fonts\.googleapis|fonts\.gstatic|<script[^>]+src="https?:/);
});

test("todo fichero local referenciado existe", () => {
  const refs = [...(html + css + js).matchAll(/["'(](\/(?:img|fonts)\/[^"')]+|\/[\w.-]+\.(?:css|js|png|jpg|webp|xml|txt))["')]/g)].map((m) => m[1]);
  assert.ok(refs.length > 5);
  for (const r of refs) assert.ok(existsSync(pub(r)), `falta ${r}`);
});

test("las imágenes y el canvas tienen texto alternativo", () => {
  assert.match(html, /<canvas[^>]+aria-label="[^"]+"/);
  for (const m of html.matchAll(/role="img"(?![^>]*aria-label)/g)) assert.fail('role="img" sin aria-label: ' + m.index);
});

test("«Rezamos contigo» va marcado como ejemplo y con la nota de privacidad", () => {
  assert.match(html, /class="rc__tag">Ejemplo · /);
  assert.match(html, /Ejemplo: Celeste y su petición no son reales\./);
  assert.match(html, /En la app, tus intenciones son privadas salvo que decidas\s+compartirlas\./);
});

test("las pantallas de la app tienen texto alternativo", () => {
  const phones = [...html.matchAll(/<img src="\/img\/app_[^"]+" alt="([^"]*)"/g)];
  assert.equal(phones.length, 3);
  for (const m of phones) assert.ok(m[1].length > 10);
});

test("aviso legal y privacidad existen, en español, con titular y contacto", () => {
  for (const page of ["aviso-legal", "privacidad"]) {
    const src = readFileSync(pub(page + "/index.html"), "utf8");
    assert.match(src, /<html lang="es">/);
    assert.equal((src.match(/<h1[\s>]/g) || []).length, 1);
    assert.match(src, /Juan Ramón Gutiérrez Blanco/);
    assert.match(src, /hola@misagradocorazon\.com/);
    assert.doesNotMatch(src, /\[NIF\]|\[DOMICILIO\]/);
    assert.match(html, new RegExp(`href="/${page}/"`));
  }
  assert.doesNotMatch(html, /\[ENLACE A LA POLÍTICA DE PRIVACIDAD\]/);
});
