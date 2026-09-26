import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { io as connect, type Socket } from "socket.io-client";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

import { prisma } from "../src/db.ts";
import { attachChat } from "../src/modules/misa/chat.ts";
import { app, bearer, resetDb, signUp, signUpAs } from "./helpers.ts";

let server: Server;
let url: string;
const sockets: Socket[] = [];

beforeAll(async () => {
  server = createServer(app);
  attachChat(server);
  await new Promise<void>((r) => server.listen(0, r));
  url = `http://localhost:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  sockets.forEach((s) => s.close());
  await new Promise((r) => server.close(r));
});

beforeEach(resetDb);

function client(token?: string): Promise<Socket> {
  const s = connect(url, { auth: token ? { token } : {}, transports: ["websocket"], forceNew: true });
  sockets.push(s);
  return new Promise((resolve, reject) => {
    s.on("connect", () => resolve(s));
    s.on("connect_error", reject);
  });
}

const emit = <T>(s: Socket, event: string, payload: unknown) =>
  new Promise<T>((resolve) => s.emit(event, payload, (res: T) => resolve(res)));

const nextEvent = <T>(s: Socket, event: string, timeoutMs = 1500) =>
  new Promise<T | null>((resolve) => {
    const t = setTimeout(() => resolve(null), timeoutMs);
    s.once(event, (payload: T) => {
      clearTimeout(t);
      resolve(payload);
    });
  });

async function createMass(editorToken: string, offsetMin: number) {
  const res = await request(app)
    .post("/api/admin/masses")
    .set(bearer(editorToken))
    .send({
      titleEs: "Misa dominical",
      titleEn: "Sunday Mass",
      youtubeUrl: "https://www.youtube.com/watch?v=abcdefghijk",
      scheduledAt: new Date(Date.now() + offsetMin * 60_000).toISOString(),
    });
  expect(res.status).toBe(201);
  return res.body.data;
}

describe("misa", () => {
  test("solo editor o superadmin programan misas", async () => {
    const user = await signUp();
    const res = await request(app).post("/api/admin/masses").set(bearer(user.token)).send({});
    expect(res.status).toBe(403);
  });

  test("el estado lo calcula el servidor: programada y en vivo", async () => {
    const editor = await signUpAs("editor");
    const future = await createMass(editor.token, 60);
    expect(future.status).toBe("scheduled");
    const next = await request(app).get("/api/masses/next");
    expect(next.body.data.id).toBe(future.id);

    const live = await createMass(editor.token, -30);
    const now = await request(app).get("/api/masses/next");
    expect(now.body.data).toMatchObject({ id: live.id, status: "live" });
  });

  test("sin misas → null", async () => {
    const res = await request(app).get("/api/masses/next");
    expect(res.body.data).toBeNull();
  });
});

describe("chat de misa en tiempo real", () => {
  test("un mensaje llega a todos los de la sala, con nombre público", async () => {
    const editor = await signUpAs("editor");
    const mass = await createMass(editor.token, -10);
    const author = await signUpAs("user", "José Luis Ramírez");
    const sender = await client(author.token);
    const listener = await client();

    expect(await emit(listener, "chat:join", { massId: mass.id })).toEqual({ ok: true });
    expect(await emit(sender, "chat:join", { massId: mass.id })).toEqual({ ok: true });
    const incoming = nextEvent<{ author: string; text: string }>(listener, "chat:message");
    const ack = await emit<{ ok: boolean; status: string }>(sender, "chat:send", { massId: mass.id, text: "Amén" });
    expect(ack).toEqual({ ok: true, status: "approved" });
    expect(await incoming).toMatchObject({ author: "José L.", text: "Amén" });

    const history = await request(app).get(`/api/masses/${mass.id}/chat`);
    expect(history.body.data.map((m: { text: string }) => m.text)).toEqual(["Amén"]);
  });

  test("sin sesión se lee pero no se escribe; sin unirse a la sala tampoco", async () => {
    const editor = await signUpAs("editor");
    const mass = await createMass(editor.token, -10);
    const anon = await client();
    await emit(anon, "chat:join", { massId: mass.id });
    expect(await emit(anon, "chat:send", { massId: mass.id, text: "Hola" })).toMatchObject({ ok: false, error: "unauthenticated" });

    const user = await signUp();
    const notJoined = await client(user.token);
    expect(await emit(notJoined, "chat:send", { massId: mass.id, text: "Hola" })).toMatchObject({ ok: false, error: "not_joined" });
  });

  test("mensaje con palabra filtrada no se difunde y va a la cola", async () => {
    const editor = await signUpAs("editor");
    const mass = await createMass(editor.token, -10);
    const user = await signUp();
    const sender = await client(user.token);
    const listener = await client();
    await emit(listener, "chat:join", { massId: mass.id });
    await emit(sender, "chat:join", { massId: mass.id });
    const incoming = nextEvent(listener, "chat:message", 800);
    const ack = await emit(sender, "chat:send", { massId: mass.id, text: "reenvía esto a 10 personas" });
    expect(ack).toEqual({ ok: true, status: "pending" });
    expect(await incoming).toBeNull();
    expect(await prisma.chatMessage.count({ where: { status: "pending" } })).toBe(1);
  });

  test("límite de un mensaje cada 3 s", async () => {
    const editor = await signUpAs("editor");
    const mass = await createMass(editor.token, -10);
    const user = await signUp();
    const s = await client(user.token);
    await emit(s, "chat:join", { massId: mass.id });
    await emit(s, "chat:send", { massId: mass.id, text: "Uno" });
    expect(await emit(s, "chat:send", { massId: mass.id, text: "Dos" })).toMatchObject({ ok: false, error: "rate_limited" });
  });

  test("el moderador oculta un mensaje y desaparece en tiempo real", async () => {
    const editor = await signUpAs("editor");
    const mod = await signUpAs("moderator");
    const mass = await createMass(editor.token, -10);
    const user = await signUp();
    const s = await client(user.token);
    const listener = await client();
    await emit(listener, "chat:join", { massId: mass.id });
    await emit(s, "chat:join", { massId: mass.id });
    await emit(s, "chat:send", { massId: mass.id, text: "Texto inoportuno" });
    const msg = await prisma.chatMessage.findFirstOrThrow();

    const removed = nextEvent<{ id: string }>(listener, "chat:removed");
    const res = await request(app).post(`/api/admin/moderation/chat/${msg.id}`).set(bearer(mod.token)).send({ action: "hide" });
    expect(res.body.data.status).toBe("hidden");
    expect(await removed).toEqual({ id: msg.id });
    const history = await request(app).get(`/api/masses/${mass.id}/chat`);
    expect(history.body.data).toHaveLength(0);
  });
});
