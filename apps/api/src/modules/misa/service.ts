import type { Mass } from "../../generated/prisma/client.ts";
import { prisma } from "../../db.ts";

export type MassStatus = "scheduled" | "live" | "ended";

// El estado lo decide el servidor, no el reloj del móvil.
export function massStatus(mass: Pick<Mass, "scheduledAt" | "durationMin">, now = new Date()): MassStatus {
  const start = mass.scheduledAt.getTime();
  const end = start + mass.durationMin * 60_000;
  if (now.getTime() < start) return "scheduled";
  if (now.getTime() <= end) return "live";
  return "ended";
}

export function massDto(m: Mass, now = new Date()) {
  return {
    id: m.id,
    title: { es: m.titleEs, en: m.titleEn },
    youtubeUrl: m.youtubeUrl,
    scheduledAt: m.scheduledAt,
    durationMin: m.durationMin,
    isSpecial: m.isSpecial,
    recordingUrl: m.recordingUrl,
    status: massStatus(m, now),
  };
}

// Misa en curso o la próxima; si no hay ninguna futura, la última celebrada (para la grabación).
export async function currentOrNextMass(now = new Date()) {
  const upcoming = await prisma.mass.findMany({
    where: { scheduledAt: { gte: new Date(now.getTime() - 8 * 3_600_000) } },
    orderBy: { scheduledAt: "asc" },
    take: 5,
  });
  const active = upcoming.find((m) => massStatus(m, now) !== "ended");
  if (active) return active;
  return prisma.mass.findFirst({ where: { scheduledAt: { lt: now } }, orderBy: { scheduledAt: "desc" } });
}
