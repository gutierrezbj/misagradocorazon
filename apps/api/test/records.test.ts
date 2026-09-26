import request from "supertest";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { prisma } from "../src/db.ts";
import { closeVoting, openVoting } from "../src/modules/causas/service.ts";
import { app, bearer, resetDb, signUp, signUpAs } from "./helpers.ts";

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-03T12:00:00Z"));
  await resetDb();
});
afterEach(() => vi.useRealTimers());

const causeBody = (n: number) => ({
  month: "2026-10",
  nameEs: `Causa ${n}`,
  nameEn: `Cause ${n}`,
  location: "Oaxaca, México",
  responsible: "Parroquia de prueba",
  descriptionEs: "Descripción",
  descriptionEn: "Description",
  budgetCents: 1_000_000,
  timeline: "3 meses",
});

// Octubre: 2 velas (0,99 + 2,99), gana la causa 1 y se le transfieren 0,50.
async function octoberWithTransfer() {
  const editor = await signUpAs("editor");
  const ids: string[] = [];
  for (const n of [1, 2, 3]) {
    vi.setSystemTime(new Date(Date.now() + 1000));
    ids.push((await request(app).post("/api/admin/causes").set(bearer(editor.token)).send(causeBody(n))).body.data.id);
  }
  await openVoting("2026-10");
  const fiel = await signUpAs("user", "Lucía Fernández");
  await request(app).post("/api/candles").set(bearer(fiel.token)).send({ saintId: "saint_guadalupe", intention: "Por mi hija", type: "basic" }).expect(201);
  await request(app).post("/api/candles").set(bearer(fiel.token)).send({ saintId: "saint_guadalupe", intention: "Por mi hija", type: "permanent" }).expect(201);
  await request(app).post(`/api/causes/${ids[0]}/vote`).set(bearer(fiel.token)).expect(201);
  await closeVoting("2026-10");
  const sa = await signUpAs("superadmin", "Ana Superadmin");
  // Con el reloj congelado, la transferencia debe ser posterior al resto para ordenar por fecha.
  vi.setSystemTime(new Date(Date.now() + 1000));
  await request(app).post(`/api/admin/causes/${ids[0]}/transfers`).set(bearer(sa.token)).send({ amountCents: 50, note: "Primera transferencia" }).expect(201);
  return { editor, sa, fiel, causeId: ids[0]! };
}

describe("transparencia en el panel", () => {
  test("totales, pendiente por mes y causa ganadora, todo desde el libro", async () => {
    const { editor } = await octoberWithTransfer();
    const res = await request(app).get("/api/admin/transparency").set(bearer(editor.token));
    expect(res.status).toBe(200);
    expect(res.body.data.totals).toEqual({ revenueCents: 99 + 299, impactCents: 20 + 60, transferredCents: 50 });
    expect(res.body.data.pendingCents).toBe(30);
    expect(res.body.data.months[0]).toMatchObject({ month: "2026-10", pendingCents: 30, cause: { name: { es: "Causa 1" } } });

    // La app pública no ve el pendiente.
    const pub = await request(app).get("/api/transparency");
    expect(pub.body.data.months[0]).not.toHaveProperty("pendingCents");
    expect(pub.body.data.totals).toEqual(res.body.data.totals);
  });

  test("movimientos del mes, filtrables y sin datos de personas", async () => {
    const { editor, fiel } = await octoberWithTransfer();
    const all = await request(app).get("/api/admin/ledger?month=2026-10").set(bearer(editor.token));
    expect(all.body.data.entries).toHaveLength(5); // 2 compras, 2 asignaciones del 20 %, 1 transferencia
    expect(all.body.data.nextCursor).toBeNull();
    const raw = JSON.stringify(all.body);
    expect(raw).not.toMatch(/Lucía|Fernández|Por mi hija|userId|@example\.com/);
    expect(raw).not.toContain(fiel.userId);

    const transfers = await request(app).get("/api/admin/ledger?month=2026-10&type=transfer").set(bearer(editor.token));
    expect(transfers.body.data.entries).toEqual([
      expect.objectContaining({ type: "transfer", amountCents: 50, note: "Primera transferencia", cause: { es: "Causa 1", en: "Cause 1" } }),
    ]);
    expect((await request(app).get("/api/admin/ledger?month=octubre").set(bearer(editor.token))).status).toBe(400);
  });

  test("un fiel no ve la transparencia del panel", async () => {
    const u = await signUp();
    expect((await request(app).get("/api/admin/transparency").set(bearer(u.token))).status).toBe(403);
    expect((await request(app).get("/api/admin/ledger?month=2026-10").set(bearer(u.token))).status).toBe(403);
  });
});

describe("registro de auditoría", () => {
  test("solo el superadmin lo ve", async () => {
    const editor = await signUpAs("editor");
    expect((await request(app).get("/api/admin/audit").set(bearer(editor.token))).status).toBe(403);
  });

  test("quién, qué y cuándo, del más reciente al más antiguo, con filtro por tipo", async () => {
    const { sa, causeId } = await octoberWithTransfer();
    const res = await request(app).get("/api/admin/audit").set(bearer(sa.token));
    expect(res.status).toBe(200);
    const entries = res.body.data.entries as { action: string; entity: string; actor: { name: string; role: string } }[];
    expect(entries[0]).toMatchObject({ action: "cause.transfer", entity: "cause", entityId: causeId, actor: { name: "Ana Superadmin", role: "superadmin", deleted: false } });
    expect(entries.filter((e) => e.action === "cause.create")).toHaveLength(3);

    const causes = await request(app).get("/api/admin/audit?entity=cause").set(bearer(sa.token));
    expect(causes.body.data.entries.every((e: { entity: string }) => e.entity === "cause")).toBe(true);
    expect((await request(app).get("/api/admin/audit?entity=nada").set(bearer(sa.token))).status).toBe(400);
  });

  test("pagina de 50 en 50 sin repetir ni saltarse registros", async () => {
    const sa = await signUpAs("superadmin");
    await prisma.adminAuditLog.createMany({
      data: Array.from({ length: 120 }, (_, i) => ({
        actorId: sa.userId,
        action: "mass.update",
        entity: "mass",
        entityId: `m${i}`,
        createdAt: new Date(Date.UTC(2026, 9, 1, 0, 0, i)),
      })),
    });
    const seen: string[] = [];
    let cursor: string | null = null;
    do {
      const res: request.Response = await request(app).get(`/api/admin/audit${cursor ? `?cursor=${cursor}` : ""}`).set(bearer(sa.token));
      seen.push(...res.body.data.entries.map((e: { entityId: string }) => e.entityId));
      cursor = res.body.data.nextCursor;
    } while (cursor);
    expect(seen).toHaveLength(120);
    expect(new Set(seen).size).toBe(120);
    expect(seen[0]).toBe("m119");
  });

  test("de una cuenta borrada no queda el nombre", async () => {
    const sa = await signUpAs("superadmin");
    const other = await signUpAs("superadmin", "Pedro Antiguo");
    await request(app).delete("/api/me").set(bearer(other.token)).send({ confirm: true }).expect(200);
    const res = await request(app).get("/api/admin/audit?entity=user").set(bearer(sa.token));
    expect(res.body.data.entries[0]).toMatchObject({ action: "account.delete", actor: { name: null, deleted: true } });
    expect(JSON.stringify(res.body)).not.toContain("Pedro");
  });
});
