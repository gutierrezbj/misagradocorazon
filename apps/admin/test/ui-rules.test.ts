// @vitest-environment node
// Reglas permanentes de CLAUDE.md aplicadas al panel: nunca texto por debajo de 14 px,
// ningún texto de la interfaz fuera de i18n y ninguna referencia a System Rapid ni al constructor.
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

const root = new URL("../src/", import.meta.url);
const files = readdirSync(root, { recursive: true })
  .map(String)
  .filter((f) => /\.(tsx?|css)$/.test(f));
const read = (f: string) => readFileSync(new URL(f, root), "utf8");
const lineOf = (src: string, i: number) => src.slice(0, i).split("\n").length;
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

describe("reglas de interfaz del panel", () => {
  test("ningún texto por debajo de 14 px", () => {
    const bad: string[] = [];
    for (const f of files) {
      const code = stripComments(read(f));
      for (const m of code.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px|fontSize:\s*(\d+(?:\.\d+)?)/g)) {
        const px = Number(m[1] ?? m[2]);
        if (px < 14) bad.push(`${f}:${lineOf(code, m.index)} ${px}px`);
      }
      for (const m of code.matchAll(/font-size:\s*[\d.]+(r?em|%)/g)) bad.push(`${f}:${lineOf(code, m.index)} tamaño relativo ${m[0]}`);
    }
    expect(bad).toEqual([]);
  });

  test("ningún texto visible escrito a mano fuera de i18n", () => {
    const bad: string[] = [];
    for (const f of files.filter((f) => f.endsWith(".tsx") && !f.endsWith("i18n.tsx"))) {
      const code = stripComments(read(f));
      for (const m of code.matchAll(/(?<![=-])>([^<>{}]*[A-Za-zÁÉÍÓÚáéíóúñÑ][^<>{}]*)</g)) {
        const text = m[1]!.trim();
        // Descarta genéricos de TypeScript (Promise<void>, etc.): solo interesa texto entre etiquetas JSX.
        if (!text || /[;=()]/.test(text) || /^[A-Z]\w*$/.test(text)) continue;
        bad.push(`${f}:${lineOf(code, m.index)} "${text}"`);
      }
      for (const m of code.matchAll(/\b(aria-label|title|alt)="([^"]*[A-Za-zÁÉÍÓÚáéíóúñ][^"]*)"/g)) {
        bad.push(`${f}:${lineOf(code, m.index)} ${m[1]}="${m[2]}"`);
      }
    }
    expect(bad).toEqual([]);
  });

  test("sin referencias a System Rapid ni al constructor", () => {
    const bad: string[] = [];
    for (const f of files) {
      const code = read(f);
      for (const m of code.matchAll(/system ?rapid|systemrapid|\bSRS\b|emergent/gi)) bad.push(`${f}:${lineOf(code, m.index)} ${m[0]}`);
    }
    expect(bad).toEqual([]);
  });
});
