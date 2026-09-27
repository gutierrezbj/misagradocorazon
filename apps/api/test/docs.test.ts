// Requisito de entrega 5: la documentación de la API y del modelo de datos tiene que coincidir con
// el código. Si se añade una ruta, una tabla o una migración sin documentarla, estos tests fallan.
import { readdirSync, readFileSync } from "node:fs";

import { expect, test } from "vitest";

import { discoverRoutes } from "./helpers.ts";

const README = readFileSync(new URL("../README.md", import.meta.url), "utf8");
const SCHEMA = readFileSync(new URL("../prisma/schema.prisma", import.meta.url), "utf8");
const DATA_MODEL = readFileSync(new URL("../../../docs/modelo-datos.md", import.meta.url), "utf8");
const MIGRATIONS = readdirSync(new URL("../prisma/migrations/", import.meta.url)).filter((d) => /^\d{14}_/.test(d));

test("cada ruta de la API está en el README, y el README no documenta rutas que no existen", () => {
  // Filas "| MÉTODO | `/api/...` |". Las de /api/auth/* son de Better Auth (una sola ruta comodín).
  const documented = [...README.matchAll(/^\| (GET|POST|PUT|PATCH|DELETE) \| `(\/api\/[^`]+)` \|/gm)]
    .map(([, method, path]) => `${method} ${path}`)
    .filter((r) => !r.includes("/api/auth/"));
  const actual = discoverRoutes()
    .filter((r) => !r.path.startsWith("/api/auth/"))
    .map((r) => `${r.method} ${r.path.startsWith("/api/") ? r.path : `/api${r.path}`}`);

  expect([...new Set(documented)].sort()).toEqual([...new Set(actual)].sort());
  expect(documented.length).toBe(new Set(documented).size); // sin filas repetidas
});

test("cada tabla y cada migración del esquema están en docs/modelo-datos.md", () => {
  const tables = [...SCHEMA.matchAll(/@@map\("([a-z_]+)"\)/g)].map(([, t]) => t!);
  expect(tables.length).toBeGreaterThan(20);
  expect(tables.filter((t) => !DATA_MODEL.includes(`\`${t}\``))).toEqual([]);
  expect(MIGRATIONS.filter((m) => !DATA_MODEL.includes(`\`${m}\``))).toEqual([]);
});
