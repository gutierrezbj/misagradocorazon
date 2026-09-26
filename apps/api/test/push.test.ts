import type { ExpoPushMessage, ExpoPushReceipt, ExpoPushTicket } from "expo-server-sdk";
import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "../src/db.ts";
import { announceVotingResult, runPendingCampaigns, runReminders } from "../src/modules/push/reminders.ts";
import { processReceipts } from "../src/modules/push/service.ts";
import { setPushTransport, type PushTransport } from "../src/modules/push/transport.ts";
import { app, bearer, resetDb, signUp, signUpAs } from "./helpers.ts";

// Transporte falso: guarda los mensajes y responde con los tickets que diga cada test.
class FakeTransport implements PushTransport {
  sent: ExpoPushMessage[] = [];
  ticketFor: (m: ExpoPushMessage, i: number) => ExpoPushTicket = (_m, i) => ({ status: "ok", id: `t${this.sent.length + i}` });
  receiptMap: Record<string, ExpoPushReceipt> = {};
  async send(messages: ExpoPushMessage[]) {
    const tickets = messages.map((m, i) => this.ticketFor(m, i));
    this.sent.push(...messages);
    return tickets;
  }
  async receipts(ids: string[]) {
    return Object.fromEntries(ids.filter((id) => this.receiptMap[id]).map((id) => [id, this.receiptMap[id]!]));
  }
}

let fake: FakeTransport;
let n = 0;
const token = () => `ExponentPushToken[test-${++n}]`;

beforeEach(async () => {
  await resetDb();
  fake = new FakeTransport();
  setPushTransport(fake);
});
afterAll(() => setPushTransport(null));

// Ciudad de México es UTC-6 todo el año: 13:31 UTC = 07:31 local.
const MX = "America/Mexico_City";
const at = (iso: string) => new Date(iso);

async function faithful(opts: { tz?: string; language?: "es" | "en"; morningTime?: string; nightTime?: string; withToken?: boolean } = {}) {
  const u = await signUp();
  await prisma.user.update({
    where: { id: u.userId },
    data: {
      timezone: opts.tz ?? MX,
      language: opts.language ?? "es",
      ...(opts.morningTime && { morningTime: opts.morningTime }),
      ...(opts.nightTime && { nightTime: opts.nightTime }),
    },
  });
  const t = token();
  if (opts.withToken !== false) {
    await request(app).put("/api/me/push-tokens").set(bearer(u.token)).send({ token: t, platform: "ios" }).expect(200);
  }
  return { ...u, pushToken: t };
}

describe("registro de dispositivos", () => {
  it("guarda el token, lo pasa de cuenta si el dispositivo cambia y solo borra el propio", async () => {
    const a = await faithful();
    const b = await signUp();
    await request(app).put("/api/me/push-tokens").set(bearer(b.token)).send({ token: a.pushToken, platform: "android" }).expect(200);
    expect(await prisma.pushToken.findUnique({ where: { token: a.pushToken } })).toMatchObject({ userId: b.userId, platform: "android" });

    const notMine = await request(app).delete("/api/me/push-tokens").set(bearer(a.token)).send({ token: a.pushToken });
    expect(notMine.body.data.removed).toBe(0);
    const mine = await request(app).delete("/api/me/push-tokens").set(bearer(b.token)).send({ token: a.pushToken });
    expect(mine.body.data.removed).toBe(1);
  });

  it("rechaza tokens que no son de Expo y exige sesión", async () => {
    const u = await signUp();
    const bad = await request(app).put("/api/me/push-tokens").set(bearer(u.token)).send({ token: "abc", platform: "ios" });
    expect(bad.status).toBe(400);
    const anon = await request(app).put("/api/me/push-tokens").send({ token: token(), platform: "ios" });
    expect(anon.status).toBe(401);
  });

  it("las preferencias se leen y se cambian en /me", async () => {
    const u = await signUp();
    const me = await request(app).get("/api/me").set(bearer(u.token));
    expect(me.body.data).toMatchObject({ notifyMorning: true, notifyNight: true, notifySaint: true, notifyCommunity: true });
    const patched = await request(app).patch("/api/me").set(bearer(u.token)).send({ notifyNight: false, notifyCommunity: false });
    expect(patched.body.data).toMatchObject({ notifyNight: false, notifyCommunity: false, notifyMorning: true });
  });
});

describe("recordatorios de oración", () => {
  it("llegan a la hora local, una sola vez, en el idioma del fiel y abren la oración", async () => {
    const es = await faithful({ morningTime: "07:30" });
    const en = await faithful({ morningTime: "07:30", language: "en" });
    await faithful({ morningTime: "08:00" });

    const r = await runReminders(at("2026-10-05T13:31:00Z"));
    expect(r.morning).toBe(2);
    const byToken = new Map(fake.sent.map((m) => [m.to, m]));
    expect(byToken.get(es.pushToken)).toMatchObject({
      title: "Oración de la mañana",
      body: "Buenos días. Tu oración de la mañana está lista.",
      data: { url: "/prayer?kind=morning" },
      ttl: 7200,
    });
    expect(byToken.get(en.pushToken)?.title).toBe("Morning prayer");

    // Siguientes pasadas dentro de la ventana: no se repite.
    await runReminders(at("2026-10-05T13:32:00Z"));
    await runReminders(at("2026-10-05T13:32:30Z"));
    expect(fake.sent).toHaveLength(2);
  });

  it("respeta preferencias, bloqueos y a quien no tiene dispositivo", async () => {
    const off = await faithful({ morningTime: "07:30" });
    await prisma.user.update({ where: { id: off.userId }, data: { notifyMorning: false } });
    const blocked = await faithful({ morningTime: "07:30" });
    await prisma.user.update({ where: { id: blocked.userId }, data: { blocked: true } });
    await faithful({ morningTime: "07:30", withToken: false });

    await runReminders(at("2026-10-05T13:30:00Z"));
    expect(fake.sent).toHaveLength(0);
  });

  it("usa la zona de cada fiel y no repite al cruzar la medianoche", async () => {
    const madrid = await faithful({ tz: "Europe/Madrid", nightTime: "23:59" });
    // 21:59 UTC = 23:59 en Madrid (horario de verano); 22:01 UTC = 00:01 del día siguiente.
    await runReminders(at("2026-09-28T21:59:00Z"));
    await runReminders(at("2026-09-28T22:01:00Z"));
    expect(fake.sent.filter((m) => m.to === madrid.pushToken)).toHaveLength(1);
    expect(await prisma.pushDelivery.findMany({ where: { userId: madrid.userId } })).toMatchObject([{ kind: "night", ref: "2026-09-28" }]);
  });
});

describe("santo del día", () => {
  it("sale a las 07:00 locales con el santo del contenido de hoy y abre su ficha", async () => {
    const u = await faithful({ language: "en" });
    await prisma.dailyContent.create({
      data: {
        date: "2026-10-05",
        saintOfDayId: "saint_guadalupe",
        gospelRef: "Lc 1",
        gospelEs: "…",
        gospelEn: "…",
        meditationEs: "…",
        meditationEn: "…",
        morningPrayerEs: "…",
        morningPrayerEn: "…",
        nightPrayerEs: "…",
        nightPrayerEn: "…",
      },
    });
    const saint = await prisma.saint.findUniqueOrThrow({ where: { id: "saint_guadalupe" } });
    await runReminders(at("2026-10-05T13:00:00Z"));
    const msg = fake.sent.find((m) => m.to === u.pushToken);
    expect(msg).toMatchObject({
      title: "Saint of the day",
      body: `Today we celebrate ${saint.name}. Discover their story.`,
      data: { url: "/saint/saint_guadalupe" },
      richContent: { image: saint.imageUrl },
    });
  });

  it("sin contenido del día no se envía nada", async () => {
    await faithful();
    await runReminders(at("2026-10-05T13:00:00Z"));
    expect(fake.sent).toHaveLength(0);
  });
});

describe("causa ganadora y limpieza de tokens", () => {
  it("anuncia la ganadora a quien acepta avisos de la comunidad", async () => {
    const yes = await faithful();
    const no = await faithful();
    await prisma.user.update({ where: { id: no.userId }, data: { notifyCommunity: false } });
    const cause = await prisma.cause.create({
      data: {
        month: "2026-10",
        nameEs: "Agua para San Juan",
        nameEn: "Water for San Juan",
        location: "Oaxaca",
        responsible: "Parroquia",
        descriptionEs: "…",
        descriptionEn: "…",
        budgetCents: 100000,
        timeline: "3 meses",
        status: "won",
      },
    });
    expect(await announceVotingResult("2026-10", cause.id)).toBe(1);
    expect(await announceVotingResult("2026-10", cause.id)).toBe(0);
    expect(fake.sent).toHaveLength(1);
    expect(fake.sent[0]).toMatchObject({ to: yes.pushToken, body: "La comunidad ha elegido: Agua para San Juan.", data: { url: "/causas" } });
  });

  it("borra los tokens de apps desinstaladas, por ticket o por recibo", async () => {
    const a = await faithful({ morningTime: "07:30" });
    const b = await faithful({ morningTime: "07:30" });
    fake.ticketFor = (m, i) =>
      m.to === a.pushToken
        ? { status: "error", message: "gone", details: { error: "DeviceNotRegistered" } }
        : { status: "ok", id: `ticket-${i}` };
    await runReminders(at("2026-10-05T13:30:00Z"));
    expect(await prisma.pushToken.findUnique({ where: { token: a.pushToken } })).toBeNull();

    const ticket = await prisma.pushTicket.findFirstOrThrow({ where: { token: b.pushToken } });
    fake.receiptMap[ticket.id] = { status: "error", message: "gone", details: { error: "DeviceNotRegistered" } };
    // Recibos: solo se consultan pasados 15 minutos.
    expect((await processReceipts(new Date(ticket.createdAt.getTime() + 60_000))).checked).toBe(0);
    const r = await processReceipts(new Date(ticket.createdAt.getTime() + 16 * 60_000));
    expect(r).toEqual({ checked: 1, removedTokens: 1 });
    expect(await prisma.pushToken.findUnique({ where: { token: b.pushToken } })).toBeNull();
    expect(await prisma.pushTicket.count()).toBe(0);
  });
});

describe("avisos del equipo (panel)", () => {
  const campaign = { titleEs: "Novena guadalupana", titleEn: "Guadalupe novena", bodyEs: "Empieza hoy.", bodyEn: "It starts today." };

  it("solo editores y superadmin los crean; quedan auditados y el worker los envía una vez", async () => {
    const mod = await signUpAs("moderator");
    expect((await request(app).post("/api/admin/push/campaigns").set(bearer(mod.token)).send(campaign)).status).toBe(403);

    const es = await faithful();
    const en = await faithful({ language: "en" });
    const quiet = await faithful();
    await prisma.user.update({ where: { id: quiet.userId }, data: { notifyCommunity: false } });
    const editor = await signUpAs("editor");

    const list0 = await request(app).get("/api/admin/push/campaigns").set(bearer(editor.token));
    expect(list0.body.data.audience).toBe(2);

    const created = await request(app).post("/api/admin/push/campaigns").set(bearer(editor.token)).send(campaign);
    expect(created.status).toBe(201);
    expect(await prisma.adminAuditLog.count({ where: { action: "push.campaign_create", entityId: created.body.data.id } })).toBe(1);

    expect(await runPendingCampaigns()).toBe(1);
    expect(await runPendingCampaigns()).toBe(0);
    const byToken = new Map(fake.sent.map((m) => [m.to, m]));
    expect(fake.sent).toHaveLength(2);
    expect(byToken.get(es.pushToken)).toMatchObject({ title: "Novena guadalupana", body: "Empieza hoy.", data: { url: "/" } });
    expect(byToken.get(en.pushToken)?.title).toBe("Guadalupe novena");

    const list = await request(app).get("/api/admin/push/campaigns").set(bearer(editor.token));
    expect(list.body.data.campaigns[0]).toMatchObject({ recipients: 2, title: { es: "Novena guadalupana" } });
    expect(list.body.data.campaigns[0].sentAt).not.toBeNull();
  });

  it("si el envío se corta a medias, al reanudar no repite a quien ya lo recibió", async () => {
    const a = await faithful();
    await faithful();
    const editor = await signUpAs("editor");
    const { body } = await request(app).post("/api/admin/push/campaigns").set(bearer(editor.token)).send(campaign);
    // Simula un corte: a ya consta como enviado, la campaña sigue pendiente.
    await prisma.pushDelivery.create({ data: { userId: a.userId, kind: "campaign", ref: body.data.id } });
    await runPendingCampaigns();
    expect(fake.sent.map((m) => m.to)).not.toContain(a.pushToken);
    expect(fake.sent).toHaveLength(1);
    expect(await prisma.pushCampaign.findUniqueOrThrow({ where: { id: body.data.id } })).toMatchObject({ recipients: 2 });
  });

  it("valida longitudes para que no se corten en la pantalla de bloqueo", async () => {
    const editor = await signUpAs("editor");
    const res = await request(app).post("/api/admin/push/campaigns").set(bearer(editor.token)).send({ ...campaign, titleEs: "x".repeat(61) });
    expect(res.status).toBe(400);
  });
});
