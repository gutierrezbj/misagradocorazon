// Envío de notificaciones push. Cada envío es "como mucho una vez" por persona, tipo y referencia:
// primero se anota en push_delivery y después se envía. Si algo falla, no se reintenta (SDD: no ser invasivo).
import type { ExpoPushMessage } from "expo-server-sdk";

import type { PushKind } from "../../generated/prisma/client.ts";
import { prisma } from "../../db.ts";
import { pushTransport } from "./transport.ts";

type Locale = "es" | "en";
export type Recipient = { id: string; language: Locale };
export type Content = {
  title: string;
  body: string;
  /** Ruta de la app que se abre al tocar la notificación (expo-router). */
  url: string;
  image?: string;
};

// Las notificaciones de oración caducan a las 2 h: si el móvil estaba apagado, no llegan tarde.
const TTL_SECONDS = 2 * 60 * 60;
// Canal Android creado por la app (src/push.ts).
const ANDROID_CHANNEL = "default";

export async function deliver(
  kind: PushKind,
  ref: string,
  recipients: Recipient[],
  contentFor: (r: Recipient) => Content,
): Promise<number> {
  if (recipients.length === 0) return 0;
  const ids = recipients.map((r) => r.id);

  const already = await prisma.pushDelivery.findMany({ where: { kind, ref, userId: { in: ids } }, select: { userId: true } });
  const done = new Set(already.map((d) => d.userId));
  const pending = recipients.filter((r) => !done.has(r.id));
  if (pending.length === 0) return 0;

  await prisma.pushDelivery.createMany({
    data: pending.map((r) => ({ userId: r.id, kind, ref })),
    skipDuplicates: true,
  });

  const tokens = await prisma.pushToken.findMany({ where: { userId: { in: pending.map((r) => r.id) } } });
  const byUser = new Map(pending.map((r) => [r.id, r]));
  const messages: ExpoPushMessage[] = tokens.map((t) => {
    const c = contentFor(byUser.get(t.userId)!);
    return {
      to: t.token,
      title: c.title,
      body: c.body,
      data: { url: c.url },
      sound: "default",
      ttl: TTL_SECONDS,
      channelId: ANDROID_CHANNEL,
      ...(c.image && { richContent: { image: c.image }, mutableContent: true }),
    };
  });
  if (messages.length === 0) return pending.length;

  const tickets = await pushTransport().send(messages);
  const okTickets: { id: string; token: string }[] = [];
  const dead: string[] = [];
  tickets.forEach((ticket, i) => {
    const token = messages[i]!.to as string;
    if (ticket.status === "ok") okTickets.push({ id: ticket.id, token });
    else if (ticket.details?.error === "DeviceNotRegistered") dead.push(token);
    else console.error("push: ticket con error", ticket.message);
  });
  if (okTickets.length) await prisma.pushTicket.createMany({ data: okTickets, skipDuplicates: true });
  if (dead.length) await prisma.pushToken.deleteMany({ where: { token: { in: dead } } });
  return pending.length;
}

// Los recibos de Expo están disponibles unos minutos después del envío. Los tokens que ya no
// existen (app desinstalada) se borran. Los tickets se descartan pasado un día.
export async function processReceipts(now = new Date()) {
  const minAge = new Date(now.getTime() - 15 * 60 * 1000);
  const maxAge = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  await prisma.pushTicket.deleteMany({ where: { createdAt: { lt: maxAge } } });

  const tickets = await prisma.pushTicket.findMany({ where: { createdAt: { lte: minAge } }, take: 1000 });
  if (tickets.length === 0) return { checked: 0, removedTokens: 0 };
  const receipts = await pushTransport().receipts(tickets.map((t) => t.id));

  const dead = tickets
    .filter((t) => {
      const r = receipts[t.id];
      return r?.status === "error" && r.details?.error === "DeviceNotRegistered";
    })
    .map((t) => t.token);
  if (dead.length) await prisma.pushToken.deleteMany({ where: { token: { in: dead } } });
  // Solo se borran los tickets con recibo; los que aún no lo tienen se miran en la siguiente pasada.
  await prisma.pushTicket.deleteMany({ where: { id: { in: tickets.filter((t) => receipts[t.id]).map((t) => t.id) } } });
  return { checked: tickets.length, removedTokens: dead.length };
}

// Destinatarios con al menos un dispositivo registrado, no bloqueados.
export const reachable = { blocked: false, pushTokens: { some: {} } } as const;
