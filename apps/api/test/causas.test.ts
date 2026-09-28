import request from "supertest";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { prisma } from "../src/db.ts";
import { closeVoting, openVoting } from "../src/modules/causas/service.ts";
import { app, bearer, resetDb, signUp, signUpAs } from "./helpers.ts";

// 3 de octubre de 2026: dentro de la ventana de votación (días 1-7).
const IN_WINDOW = new Date("2026-10-03T12:00:00Z");
const OUT_OF_WINDOW = new Date("2026-10-12T12:00:00Z");

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(IN_WINDOW);
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
  fundsUseEs: "Destino",
  fundsUseEn: "Use of funds",
  budgetItems: [{ conceptEs: "Obra", conceptEn: "Works", amountCents: 1_000_000 }],
  timeline: "3 meses",
});

async function setupVoting() {
  const editor = await signUpAs("editor");
  const ids: string[] = [];
  for (const n of [1, 2, 3]) {
    // El reloj está congelado: se avanza 1 s para que cada causa tenga su propia fecha de alta.
    vi.setSystemTime(new Date(Date.now() + 1000));
    const res = await request(app).post("/api/admin/causes").set(bearer(editor.token)).send(causeBody(n));
    expect(res.status).toBe(201);
    ids.push(res.body.data.id);
  }
  expect(await openVoting("2026-10")).toEqual({ opened: 3 });
  return { editor, ids };
}

describe("causas y votación", () => {
  test("un usuario no puede crear causas", async () => {
    const user = await signUp();
    const res = await request(app).post("/api/admin/causes").set(bearer(user.token)).send(causeBody(1));
    expect(res.status).toBe(403);
  });

  test("no se crean causas para meses pasados", async () => {
    const editor = await signUpAs("editor");
    const res = await request(app).post("/api/admin/causes").set(bearer(editor.token)).send({ ...causeBody(1), month: "2026-09" });
    expect(res.status).toBe(400);
  });

  test("votar: un voto por mes, porcentajes y mi voto", async () => {
    const { ids } = await setupVoting();
    const a = await signUp();
    const b = await signUp();
    expect((await request(app).post(`/api/causes/${ids[0]}/vote`).set(bearer(a.token))).status).toBe(201);
    expect((await request(app).post(`/api/causes/${ids[1]}/vote`).set(bearer(b.token))).status).toBe(201);
    const again = await request(app).post(`/api/causes/${ids[2]}/vote`).set(bearer(a.token));
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe("already_voted");

    const mine = await request(app).get("/api/votes/me").set(bearer(a.token));
    expect(mine.body.data).toMatchObject([{ month: "2026-10", cause: { id: ids[0], name: { es: "Causa 1" } } }]);

    const current = await request(app).get("/api/causes/current").set(bearer(a.token));
    expect(current.body.data).toMatchObject({ month: "2026-10", votingOpen: true, totalVotes: 2, myVoteCauseId: ids[0] });
    expect(current.body.data.causes.map((c: { percentage: number }) => c.percentage)).toEqual([50, 50, 0]);
  });

  test("dos votos simultáneos del mismo usuario: solo cuenta uno", async () => {
    const { ids } = await setupVoting();
    const u = await signUp();
    const [r1, r2] = await Promise.all([
      request(app).post(`/api/causes/${ids[0]}/vote`).set(bearer(u.token)),
      request(app).post(`/api/causes/${ids[1]}/vote`).set(bearer(u.token)),
    ]);
    expect([r1.status, r2.status].sort()).toEqual([201, 409]);
    expect(await prisma.vote.count()).toBe(1);
  });

  test("fuera de los días 1-7 no se vota", async () => {
    const { ids } = await setupVoting();
    vi.setSystemTime(OUT_OF_WINDOW);
    const u = await signUp();
    const res = await request(app).post(`/api/causes/${ids[0]}/vote`).set(bearer(u.token));
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("voting_closed");
  });

  test("editar una candidata solo cambia lo enviado (no borra las fotos)", async () => {
    const editor = await signUpAs("editor");
    const photos = ["https://media.example/pozo-1.jpg"];
    const created = await request(app).post("/api/admin/causes").set(bearer(editor.token)).send({ ...causeBody(1), photos }).expect(201);
    const res = await request(app).patch(`/api/admin/causes/${created.body.data.id}`).set(bearer(editor.token)).send({ nameEs: "Pozo de agua" });
    expect(res.status).toBe(200);
    const stored = await prisma.cause.findUniqueOrThrow({ where: { id: created.body.data.id } });
    expect(stored).toMatchObject({ nameEs: "Pozo de agua", nameEn: "Cause 1", photos });
  });

  test("ficha completa: destino del dinero y presupuesto desglosado; el total es la suma de las partidas", async () => {
    const editor = await signUpAs("editor");
    const items = [
      { conceptEs: "Perforación", conceptEn: "Drilling", amountCents: 600_000 },
      { conceptEs: "Bomba solar", conceptEn: "Solar pump", amountCents: 250_050 },
    ];
    const created = await request(app)
      .post("/api/admin/causes")
      .set(bearer(editor.token))
      .send({ ...causeBody(1), fundsUseEs: "Perforar y equipar el pozo", fundsUseEn: "Drill and equip the well", budgetItems: items });
    expect(created.status).toBe(201);
    expect(created.body.data.budgetCents).toBe(850_050);

    // Mientras es candidata no es pública.
    expect((await request(app).get(`/api/causes/${created.body.data.id}`)).status).toBe(404);
    await openVoting("2026-10");
    const pub = await request(app).get(`/api/causes/${created.body.data.id}`);
    expect(pub.status).toBe(200);
    expect(pub.body.data).toMatchObject({
      fundsUse: { es: "Perforar y equipar el pozo", en: "Drill and equip the well" },
      budgetCents: 850_050,
      budgetItems: [
        { concept: { es: "Perforación", en: "Drilling" }, amountCents: 600_000 },
        { concept: { es: "Bomba solar", en: "Solar pump" }, amountCents: 250_050 },
      ],
      timeline: "3 meses",
      updates: [],
    });
    const current = await request(app).get("/api/causes/current");
    expect(current.body.data.causes[0].budgetItems).toHaveLength(2);
  });

  test("al editar las partidas se sustituyen enteras y el total se recalcula", async () => {
    const editor = await signUpAs("editor");
    const created = await request(app).post("/api/admin/causes").set(bearer(editor.token)).send(causeBody(1));
    const id = created.body.data.id;
    const res = await request(app)
      .patch(`/api/admin/causes/${id}`)
      .set(bearer(editor.token))
      .send({ budgetItems: [{ conceptEs: "Techo", conceptEn: "Roof", amountCents: 300_000 }, { conceptEs: "Mano de obra", conceptEn: "Labour", amountCents: 100_000 }] });
    expect(res.status).toBe(200);
    expect(res.body.data.budgetCents).toBe(400_000);
    expect(res.body.data.budgetItems.map((i: { concept: { es: string } }) => i.concept.es)).toEqual(["Techo", "Mano de obra"]);
    expect(await prisma.causeBudgetItem.count({ where: { causeId: id } })).toBe(2);

    // Sin partidas no se toca el presupuesto.
    await request(app).patch(`/api/admin/causes/${id}`).set(bearer(editor.token)).send({ nameEs: "Capilla" }).expect(200);
    expect((await prisma.cause.findUniqueOrThrow({ where: { id } })).budgetCents).toBe(400_000);
  });

  test("una causa sin destino del dinero o sin partidas no se crea", async () => {
    const editor = await signUpAs("editor");
    const { fundsUseEs: _f, ...noFunds } = causeBody(1);
    expect((await request(app).post("/api/admin/causes").set(bearer(editor.token)).send(noFunds)).status).toBe(400);
    expect((await request(app).post("/api/admin/causes").set(bearer(editor.token)).send({ ...causeBody(1), budgetItems: [] })).status).toBe(400);
  });

  test("una causa inexistente o de otro estado desconocido da 404", async () => {
    expect((await request(app).get("/api/causes/no-existe")).status).toBe(404);
  });

  test("una causa en votación no se puede editar", async () => {
    const { editor, ids } = await setupVoting();
    const res = await request(app).patch(`/api/admin/causes/${ids[0]}`).set(bearer(editor.token)).send({ nameEs: "Otra" });
    expect(res.status).toBe(409);
  });

  test("cierre: gana la más votada, el resto se archiva; es idempotente", async () => {
    const { ids } = await setupVoting();
    for (const causeId of [ids[1], ids[1], ids[0]]) {
      const u = await signUp();
      await request(app).post(`/api/causes/${causeId}/vote`).set(bearer(u.token));
    }
    expect(await closeVoting("2026-10")).toEqual({ winnerId: ids[1] });
    expect(await closeVoting("2026-10")).toEqual({ winnerId: null });
    const statuses = await prisma.cause.findMany({ orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: { status: true } });
    expect(statuses.map((s) => s.status)).toEqual(["archived", "won", "archived"]);
  });

  test("empate: gana la que se dio de alta antes", async () => {
    const { ids } = await setupVoting();
    expect(await closeVoting("2026-10")).toEqual({ winnerId: ids[0] });
  });
});

describe("transparencia", () => {
  test("todo sale del libro: ingresos, 20 % y transferencias", async () => {
    const { ids } = await setupVoting();
    const fiel = await signUp();
    for (const type of ["basic", "solemn", "permanent"]) {
      await request(app).post("/api/candles").set(bearer(fiel.token)).send({ saintId: "saint_guadalupe", intention: "Por todos", type });
    }
    await closeVoting("2026-10");

    const editor = await signUpAs("editor");
    const denied = await request(app).post(`/api/admin/causes/${ids[0]}/transfers`).set(bearer(editor.token)).send({ amountCents: 120 });
    expect(denied.status).toBe(403);

    const sa = await signUpAs("superadmin");
    const transfer = await request(app)
      .post(`/api/admin/causes/${ids[0]}/transfers`)
      .set(bearer(sa.token))
      .send({ amountCents: 120, note: "Transferencia de prueba" });
    expect(transfer.status).toBe(201);

    const t = await request(app).get("/api/transparency");
    expect(t.body.data.totals).toEqual({ revenueCents: 99 + 199 + 299, impactCents: 20 + 40 + 60, transferredCents: 120 });
    expect(t.body.data.months[0]).toMatchObject({ month: "2026-10", cause: { id: ids[0], status: "funded" } });

    const log = await prisma.adminAuditLog.findFirstOrThrow({ where: { action: "cause.transfer" } });
    expect(log.actorId).toBe(sa.userId);
  });

  test("solo las causas ganadoras reciben transferencias y publican avances", async () => {
    const { ids } = await setupVoting();
    const sa = await signUpAs("superadmin");
    const res = await request(app).post(`/api/admin/causes/${ids[0]}/transfers`).set(bearer(sa.token)).send({ amountCents: 100 });
    expect(res.status).toBe(409);
    const upd = await request(app).post(`/api/admin/causes/${ids[0]}/updates`).set(bearer(sa.token)).send({ textEs: "a", textEn: "a" });
    expect(upd.status).toBe(409);
  });

  test("historial con avances de la causa financiada", async () => {
    const { ids } = await setupVoting();
    await closeVoting("2026-10");
    const editor = await signUpAs("editor");
    await request(app)
      .post(`/api/admin/causes/${ids[0]}/updates`)
      .set(bearer(editor.token))
      .send({ textEs: "Techo reparado", textEn: "Roof repaired" });
    const res = await request(app).get("/api/causes/history");
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].updates[0].text).toEqual({ es: "Techo reparado", en: "Roof repaired" });
  });
});
