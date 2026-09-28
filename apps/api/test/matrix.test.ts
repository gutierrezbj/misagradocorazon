// SDD-07 (26-sep-2026), tests obligatorios:
// - Permisos: cada endpoint del panel probado con los cuatro roles (y sin sesión).
// - Privacidad: los endpoints públicos no devuelven user_id ni datos de terceros.
// Las rutas se descubren del propio router: una ruta nueva sin clasificar hace fallar el test.
import request from "supertest";
import { beforeEach, describe, expect, test } from "vitest";

import { prisma } from "../src/db.ts";
import { app, bearer, discoverRoutes, resetDb, signUp, signUpAs } from "./helpers.ts";

type Role = "user" | "moderator" | "editor" | "superadmin";

// Quién puede usar cada endpoint del panel. El superadmin puede con todo.
const MOD: Role[] = ["moderator", "superadmin"];
const EDIT: Role[] = ["editor", "superadmin"];
const STAFF: Role[] = ["moderator", "editor", "superadmin"];
const SUPER: Role[] = ["superadmin"];
const PANEL: Record<string, Role[]> = {
  "GET /admin/kpis": STAFF,
  "GET /admin/transparency": STAFF,
  "GET /admin/ledger": STAFF,
  "GET /admin/moderation/queue": MOD,
  "POST /admin/moderation/intentions/:id": MOD,
  "POST /admin/moderation/chat/:id": MOD,
  "GET /admin/moderation/words": MOD,
  "POST /admin/moderation/words": MOD,
  "DELETE /admin/moderation/words/:word": MOD,
  "GET /admin/causes": EDIT,
  "POST /admin/causes": EDIT,
  "PATCH /admin/causes/:id": EDIT,
  "POST /admin/causes/:id/updates": EDIT,
  "GET /admin/masses": EDIT,
  "POST /admin/masses": EDIT,
  "PATCH /admin/masses/:id": EDIT,
  "DELETE /admin/masses/:id": EDIT,
  "GET /admin/push/campaigns": EDIT,
  "POST /admin/push/campaigns": EDIT,
  "GET /admin/saints": EDIT,
  "POST /admin/saints": EDIT,
  "PATCH /admin/saints/:id": EDIT,
  "DELETE /admin/saints/:id": EDIT,
  "POST /admin/saints/:id/restore": EDIT,
  "GET /admin/daily": EDIT,
  "GET /admin/daily/:date": EDIT,
  "PUT /admin/daily/:date": EDIT,
  "GET /admin/seasonal-prayers": EDIT,
  "PUT /admin/seasonal-prayers/:season/:kind": EDIT,
  "POST /admin/uploads": EDIT,
  "GET /admin/users": SUPER,
  "PATCH /admin/users/:id": SUPER,
  "POST /admin/causes/:id/transfers": SUPER,
  "GET /admin/audit": SUPER,
};

const concrete = (path: string) =>
  path.replace(":date", "2026-01-01").replace(":word", "palabra").replace(/:\w+/g, "00000000-0000-4000-8000-000000000000");

const panelRoutes = () => discoverRoutes().filter((r) => r.path.startsWith("/admin"));

beforeEach(resetDb);

describe("matriz de permisos del panel", () => {
  test("todas las rutas del panel están clasificadas (y no sobra ninguna)", () => {
    const found = panelRoutes().map((r) => `${r.method} ${r.path}`).sort();
    expect(found).toEqual(Object.keys(PANEL).sort());
  });

  test("sin sesión → 401; rol sin permiso → 403; rol con permiso pasa el control de acceso", async () => {
    const tokens = {} as Record<Role, string>;
    for (const role of ["user", "moderator", "editor", "superadmin"] as Role[]) tokens[role] = (await signUpAs(role)).token;
    const failures: string[] = [];
    for (const { method, path } of panelRoutes()) {
      const key = `${method} ${path}`;
      const call = (token?: string) => {
        const r = request(app)[method.toLowerCase() as "get"](`/api${concrete(path)}`);
        return (token ? r.set(bearer(token)) : r).send({});
      };
      const anon = await call();
      if (anon.status !== 401) failures.push(`${key} sin sesión → ${anon.status}`);
      for (const role of Object.keys(tokens) as Role[]) {
        const res = await call(tokens[role]);
        const allowed = PANEL[key]!.includes(role);
        if (allowed && (res.status === 401 || res.status === 403)) failures.push(`${key} ${role} → ${res.status} (debería pasar)`);
        if (!allowed && res.status !== 403) failures.push(`${key} ${role} → ${res.status} (debería ser 403)`);
      }
    }
    expect(failures).toEqual([]);
  });
});

describe("privacidad de los endpoints públicos", () => {
  test("ningún GET público devuelve ids de usuario, emails, nombres completos ni intenciones privadas", async () => {
    // Actividad de un fiel con datos reconocibles en todos los pilares.
    const fiel = await signUpAs("user", "Rosario Castellanos Figueroa");
    const h = bearer(fiel.token);
    await request(app).post("/api/candles").set(h).send({ saintId: "saint_guadalupe", intention: "SECRETO-VELA", type: "basic" }).expect(201);
    await request(app).post("/api/me/intentions").set(h).send({ text: "SECRETO-PRIVADA" }).expect(201);
    await request(app).post("/api/intentions").set(h).send({ text: "Por la paz del mundo" }).expect(201);
    await request(app).post("/api/prayers/complete").set(h).send({ kind: "morning" });
    const editor = await signUpAs("editor");
    const mass = await request(app)
      .post("/api/admin/masses")
      .set(bearer(editor.token))
      .send({ titleEs: "Misa", titleEn: "Mass", youtubeUrl: "https://www.youtube.com/watch?v=abcdefghijk", scheduledAt: new Date(Date.now() - 60_000).toISOString() });
    await prisma.chatMessage.create({ data: { massId: mass.body.data.id, userId: fiel.userId, text: "Amén", status: "approved" } });

    const users = await prisma.user.findMany({ select: { id: true, email: true } });
    const forbidden = [...users.flatMap((u) => [u.id, u.email]), "Castellanos", "Figueroa", "SECRETO-VELA", "SECRETO-PRIVADA", "userId"];

    const params: Record<string, string> = { ":id": "saint_guadalupe" };
    const publicGets = discoverRoutes().filter(
      (r) => r.method === "GET" && !r.path.startsWith("/admin") && !r.path.startsWith("/me") && !r.path.startsWith("/api/auth"),
    );
    expect(publicGets.length).toBeGreaterThan(8);
    const leaks: string[] = [];
    const checked: string[] = [];
    for (const { path } of publicGets) {
      let url = path.startsWith("/api/") ? path : `/api${path}`;
      url = url.replace("/masses/:id", `/masses/${mass.body.data.id}`).replace(/:id/g, params[":id"]!);
      const res = await request(app).get(url);
      if (res.status === 401) continue; // con sesión: no es público
      checked.push(`${path} ${res.status}`);
      const body = JSON.stringify(res.body);
      for (const f of forbidden) if (body.includes(f)) leaks.push(`${path} contiene ${f}`);
    }
    expect(leaks).toEqual([]);
    // Se han revisado de verdad los públicos principales.
    for (const p of ["/intentions", "/candles/community", "/transparency", "/masses/:id/chat"]) {
      expect(checked.some((c) => c.startsWith(`${p} 200`))).toBe(true);
    }
  });
});
