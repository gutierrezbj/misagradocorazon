// Reglas permanentes de CLAUDE.md que se pueden vigilar leyendo el código de la app:
// - Tamaños mínimos (usuarios mayores): nunca por debajo de 14 px.
// - Ningún texto de la interfaz escrito a mano sin pasar por i18n (salvo la marca).
// - Botones de solo icono con etiqueta para lectores de pantalla.
// - Ninguna referencia a System Rapid Solutions ni al constructor.
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const root = new URL("../", import.meta.url);
const files = ["app", "src"].flatMap((dir) =>
  readdirSync(new URL(dir, root), { recursive: true })
    .filter((f) => /\.tsx?$/.test(f))
    .map((f) => `${dir}/${f}`),
);
const read = (p) => readFileSync(new URL(p, root), "utf8");
const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
const lineOf = (src, index) => src.slice(0, index).split("\n").length;

// Textos fijos permitidos: la marca, que no se traduce.
const ALLOWED_LITERALS = new Set(["Mi Sagrado Corazón"]);

test("se han leído los ficheros de la app", () => {
  assert.ok(files.length > 30, `solo ${files.length} ficheros`);
});

test("ningún texto por debajo de 14 px", () => {
  const bad = [];
  for (const f of files) {
    const code = stripComments(read(f));
    for (const m of code.matchAll(/fontSize:\s*(\d+(?:\.\d+)?)/g)) {
      if (Number(m[1]) < 14) bad.push(`${f}:${lineOf(code, m.index)} fontSize ${m[1]}`);
    }
  }
  assert.deepEqual(bad, []);
});

test("ningún texto visible escrito a mano fuera de i18n", () => {
  const bad = [];
  for (const f of files.filter((f) => f.endsWith(".tsx") && !f.endsWith("i18n.tsx"))) {
    const code = stripComments(read(f));
    // Contenido de <Text>…</Text> que no es una expresión {…}.
    for (const m of code.matchAll(/<Text\b[^>]*>([^<{]*[A-Za-zÁÉÍÓÚáéíóúñÑ][^<{]*)</g)) {
      const text = m[1].trim();
      if (text && !ALLOWED_LITERALS.has(text)) bad.push(`${f}:${lineOf(code, m.index)} "${text}"`);
    }
    for (const m of code.matchAll(/\b(accessibilityLabel|placeholder)="([^"]*[A-Za-zÁÉÍÓÚáéíóúñ][^"]*)"/g)) {
      bad.push(`${f}:${lineOf(code, m.index)} ${m[1]}="${m[2]}"`);
    }
  }
  assert.deepEqual(bad, []);
});

test("los botones de solo icono llevan etiqueta de accesibilidad", () => {
  const bad = [];
  for (const f of files.filter((f) => f.endsWith(".tsx"))) {
    const code = read(f);
    for (const m of code.matchAll(/<(Pressable|TouchableOpacity)\b[\s\S]*?<\/\1>/g)) {
      const block = m[0];
      if (block.includes("accessibilityLabel") || /<Text\b/.test(block)) continue;
      // Zonas táctiles sin contenido propio (p. ej. la barra de progreso) llevan su etiqueta aparte.
      if (!/<Icon\b/.test(block)) continue;
      bad.push(`${f}:${lineOf(code, m.index)}`);
    }
  }
  assert.deepEqual(bad, []);
});

test("sin referencias a System Rapid ni al constructor", () => {
  const bad = [];
  for (const f of [...files, "package.json", "app.json", "eas.json"]) {
    const code = read(f);
    for (const m of code.matchAll(/system ?rapid|systemrapid|\bSRS\b|emergent/gi)) bad.push(`${f}:${lineOf(code, m.index)} ${m[0]}`);
  }
  assert.deepEqual(bad, []);
});
