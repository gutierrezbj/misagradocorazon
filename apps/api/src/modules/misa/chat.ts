// Chat de misa en tiempo real (ADR-014). Autenticación con el mismo token de sesión que la API.
import type { Server as HttpServer } from "node:http";
import { chatMessageSchema } from "@msc/shared";
import { Server, type Socket } from "socket.io";

import { auth } from "../auth/auth.ts";
import { prisma } from "../../db.ts";
import { env } from "../../env.ts";
import { publicName } from "../../lib/display-name.ts";
import { containsBannedWord } from "../../lib/moderation.ts";
import { massStatus } from "./service.ts";

type Ack = (res: { ok: boolean; error?: string; status?: string }) => void;
type SocketUser = { id: string; name: string };

let io: Server | null = null;
const lastMessageAt = new Map<string, number>();
const MIN_INTERVAL_MS = 3_000;
// Quien abre la misa antes de empezar cuenta como asistente si sigue dentro al comenzar.
const MAX_WAIT_MS = 6 * 3_600_000;

// Asistencia a misa (KPI de SDD-02): una fila por persona y misa, solo mientras está en directo.
export async function recordAttendance(massId: string, userId: string) {
  await prisma.massAttendance.createMany({ data: [{ massId, userId }], skipDuplicates: true });
}

export const roomOf = (massId: string) => `mass:${massId}`;

export function getIo(): Server | null {
  return io;
}

async function userFromToken(token: unknown): Promise<SocketUser | null> {
  if (typeof token !== "string" || !token) return null;
  const session = await auth.api.getSession({ headers: new Headers({ authorization: `Bearer ${token}` }) });
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.blocked) return null;
  return { id: user.id, name: user.name };
}

export function attachChat(httpServer: HttpServer): Server {
  const origins = env.TRUSTED_ORIGINS.split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  io = new Server(httpServer, { cors: { origin: origins }, serveClient: false });

  // Se resuelve la sesión antes de "connection" para no perder eventos enviados nada más conectar.
  // Sin sesión se puede leer el chat, pero no escribir.
  io.use(async (socket, next) => {
    socket.data.user = await userFromToken(socket.handshake.auth?.token).catch(() => null);
    next();
  });

  io.on("connection", (socket: Socket) => {
    const user = socket.data.user as SocketUser | null;

    socket.on("chat:join", async (payload: { massId?: string }, ack?: Ack) => {
      const mass = payload?.massId ? await prisma.mass.findUnique({ where: { id: payload.massId } }) : null;
      if (!mass) return ack?.({ ok: false, error: "mass_not_found" });
      await socket.join(roomOf(mass.id));
      if (user) {
        const status = massStatus(mass);
        if (status === "live") {
          await recordAttendance(mass.id, user.id).catch(() => undefined);
        } else if (status === "scheduled") {
          const wait = mass.scheduledAt.getTime() - Date.now();
          if (wait <= MAX_WAIT_MS) {
            const timer = setTimeout(() => {
              if (socket.connected && socket.rooms.has(roomOf(mass.id))) void recordAttendance(mass.id, user.id).catch(() => undefined);
            }, wait);
            socket.once("disconnect", () => clearTimeout(timer));
          }
        }
      }
      ack?.({ ok: true });
    });

    socket.on("chat:send", async (payload: { massId?: string; text?: string }, ack?: Ack) => {
      if (!user) return ack?.({ ok: false, error: "unauthenticated" });
      const massId = payload?.massId ?? "";
      if (!socket.rooms.has(roomOf(massId))) return ack?.({ ok: false, error: "not_joined" });
      const parsed = chatMessageSchema.safeParse({ text: payload?.text });
      if (!parsed.success) return ack?.({ ok: false, error: "invalid_input" });

      const now = Date.now();
      const prev = lastMessageAt.get(user.id);
      if (prev !== undefined && now - prev < MIN_INTERVAL_MS) return ack?.({ ok: false, error: "rate_limited" });
      lastMessageAt.set(user.id, now);

      const flagged = await containsBannedWord(parsed.data.text);
      const msg = await prisma.chatMessage.create({
        data: { massId, userId: user.id, text: parsed.data.text, status: flagged ? "pending" : "approved" },
      });
      if (msg.status === "approved") {
        io?.to(roomOf(massId)).emit("chat:message", {
          id: msg.id,
          author: publicName(user.name),
          text: msg.text,
          createdAt: msg.createdAt,
        });
      }
      ack?.({ ok: true, status: msg.status });
    });
  });

  return io;
}

export function resetChatRateLimits() {
  lastMessageAt.clear();
}
