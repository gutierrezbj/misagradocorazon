// Prueba de carga del chat de la misa (especificación §10: 1.000 asistentes por domingo al mes 6;
// §11: el chat propio tiene que aguantar los picos). No forma parte de `pnpm test`.
//
// Uso, con la API arrancada contra una base de desarrollo (nunca producción):
//   DATABASE_URL=... API_URL=http://localhost:8001 npx tsx scripts/load-chat.ts [fieles] [mensajes/s] [segundos]
//
// 1. Crea una misa en directo y N fieles de prueba con su sesión, directamente en la base de datos
//    (sin pasar por el registro, que tiene límite de peticiones).
// 2. Conecta N clientes de Socket.IO, que se unen a la misa, y mide cuánto tardan.
// 3. Durante unos segundos, fieles al azar escriben al ritmo indicado. Mide cuánto tarda cada
//    mensaje en llegar a todos los conectados y cuántos se pierden.
// 4. Borra todo lo creado, también si algo falla.
import { randomBytes, randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { io as connect, type Socket } from "socket.io-client";

import { PrismaClient } from "../src/generated/prisma/client.ts";

const API_URL = process.env.API_URL ?? "http://localhost:8001";
const [USERS, RATE, SECONDS] = [Number(process.argv[2] ?? 1000), Number(process.argv[3] ?? 10), Number(process.argv[4] ?? 60)];
const TAG = `loadtest-${Date.now()}`;

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const dbName = new URL(DATABASE_URL).pathname.slice(1);
if (!/(_dev|_test)$/.test(dbName)) throw new Error(`load-chat se niega a escribir en "${dbName}": solo bases _dev o _test`);
// Cliente propio: el script solo necesita DATABASE_URL, no el resto de variables de la API.
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: DATABASE_URL }) });

// Ordena una vez y lee los percentiles (con cientos de miles de valores, sin Math.max(...xs)).
const summary = (xs: number[]) => {
  if (xs.length === 0) return "sin datos";
  const s = Float64Array.from(xs).sort();
  const at = (p: number) => s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))]!.toFixed(0);
  return `p50 ${at(50)} ms · p95 ${at(95)} ms · p99 ${at(99)} ms · máx ${s[s.length - 1]!.toFixed(0)} ms`;
};

async function seed() {
  const mass = await prisma.mass.create({
    data: {
      titleEs: TAG,
      titleEn: TAG,
      youtubeUrl: "https://www.youtube.com/watch?v=loadtest001",
      scheduledAt: new Date(Date.now() - 5 * 60_000),
      durationMin: 120,
    },
  });
  const users = Array.from({ length: USERS }, (_, i) => ({
    id: `${TAG}-${i}`,
    name: `Fiel ${i}`,
    email: `${TAG}-${i}@loadtest.invalid`,
    onboarded: true,
  }));
  await prisma.user.createMany({ data: users });
  const sessions = users.map((u) => ({
    id: randomUUID(),
    token: randomBytes(24).toString("base64url"),
    userId: u.id,
    expiresAt: new Date(Date.now() + 3_600_000),
  }));
  await prisma.session.createMany({ data: sessions });
  return { massId: mass.id, tokens: sessions.map((s) => s.token) };
}

async function cleanup() {
  const where = { email: { endsWith: "@loadtest.invalid" } };
  const ids = (await prisma.user.findMany({ where, select: { id: true } })).map((u) => u.id);
  await prisma.chatMessage.deleteMany({ where: { userId: { in: ids } } });
  await prisma.massAttendance.deleteMany({ where: { userId: { in: ids } } });
  await prisma.session.deleteMany({ where: { userId: { in: ids } } });
  await prisma.user.deleteMany({ where });
  await prisma.mass.deleteMany({ where: { titleEs: { startsWith: "loadtest-" } } });
}

function join(token: string, massId: string): Promise<{ socket: Socket; ms: number }> {
  const t0 = performance.now();
  return new Promise((resolve, reject) => {
    const socket = connect(API_URL, { auth: { token }, transports: ["websocket"], reconnection: false, timeout: 20_000 });
    const fail = (e: unknown) => reject(e instanceof Error ? e : new Error(String(e)));
    socket.once("connect_error", fail);
    socket.once("connect", () => {
      socket.timeout(20_000).emit("chat:join", { massId }, (err: unknown, res: { ok: boolean }) => {
        if (err || !res?.ok) return fail(err ?? new Error("join rechazado"));
        resolve({ socket, ms: performance.now() - t0 });
      });
    });
  });
}

async function main() {
  await cleanup(); // restos de una ejecución interrumpida
  const { massId, tokens } = await seed();
  console.log(`Misa en directo y ${USERS} fieles de prueba creados`);

  // Conexión escalonada: 50 a la vez, como gente entrando al empezar la misa.
  const joinTimes: number[] = [];
  const sockets: Socket[] = [];
  let joinErrors = 0;
  const tJoin = performance.now();
  for (let i = 0; i < tokens.length; i += 50) {
    const batch = await Promise.allSettled(tokens.slice(i, i + 50).map((t) => join(t, massId)));
    for (const r of batch) {
      if (r.status === "fulfilled") {
        sockets.push(r.value.socket);
        joinTimes.push(r.value.ms);
      } else joinErrors += 1;
    }
  }
  console.log(`Conectados ${sockets.length}/${USERS} en ${((performance.now() - tJoin) / 1000).toFixed(1)} s (errores: ${joinErrors})`);
  console.log(`  Conexión + unirse a la misa: ${summary(joinTimes)}`);

  // Cada mensaje lleva su id en el texto; se mide cuándo llega a cada conectado.
  const sentAt = new Map<string, number>();
  const deliveries: number[] = [];
  const received = new Map<string, number>();
  for (const s of sockets) {
    s.on("chat:message", (m: { text: string }) => {
      const id = m.text.split(" ")[1] ?? "";
      const t = sentAt.get(id);
      if (t === undefined) return;
      deliveries.push(performance.now() - t);
      received.set(id, (received.get(id) ?? 0) + 1);
    });
  }

  const ackTimes: number[] = [];
  let sendErrors = 0;
  let seq = 0;
  const total = RATE * SECONDS;
  const tSend = performance.now();
  await new Promise<void>((done) => {
    const timer = setInterval(() => {
      if (seq >= total) {
        clearInterval(timer);
        return done();
      }
      const id = `m${seq}`;
      // Cada fiel escribe como mucho una vez cada 3 s (límite del chat): se reparte entre todos.
      const s = sockets[seq % sockets.length]!;
      seq += 1;
      const t0 = performance.now();
      sentAt.set(id, t0);
      s.timeout(20_000).emit("chat:send", { massId, text: `Amén ${id}` }, (err: unknown, res: { ok: boolean }) => {
        if (err || !res?.ok) sendErrors += 1;
        else ackTimes.push(performance.now() - t0);
      });
    }, 1000 / RATE);
  });
  // Margen para que lleguen los últimos.
  await new Promise((r) => setTimeout(r, 5000));
  const elapsed = (performance.now() - tSend) / 1000;

  const expected = sentAt.size * sockets.length;
  const lost = expected - deliveries.length;
  console.log(`Enviados ${sentAt.size} mensajes en ${elapsed.toFixed(0)} s (${RATE}/s), errores al enviar: ${sendErrors}`);
  console.log(`  Confirmación al que escribe: ${summary(ackTimes)}`);
  console.log(`  Entregas: ${deliveries.length}/${expected} (perdidas: ${lost})`);
  console.log(`  Llegada a cada conectado: ${summary(deliveries)}`);

  for (const s of sockets) s.disconnect();
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanup();
    await prisma.$disconnect();
    console.log("Datos de prueba borrados");
  });
