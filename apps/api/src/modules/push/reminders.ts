// Recordatorios diarios en la hora local de cada fiel (SDD-05 US-15, US-16, US-17).
// Abren la pantalla con el audio en marcha si existe (SDD Documentación, flujos 1 y 2: auto-play).
// El worker lo ejecuta cada minuto. Mira los últimos minutos para no perder un aviso si la
// tarea se retrasa; push_delivery garantiza que cada aviso sale una sola vez por fecha local.
import { prisma } from "../../db.ts";
import { localDate, localTime } from "../../lib/dates.ts";
import { pushCopy } from "./copy.ts";
import { deliver, reachable, type Recipient } from "./service.ts";

export const SAINT_OF_DAY_TIME = "07:00";
const LOOKBACK_MINUTES = 3;

// Minutos recientes agrupados por fecha local: al cruzar la medianoche, un minuto de las 23:59
// pertenece al día anterior y su aviso se anota con esa fecha (así no se repite al día siguiente).
function recentSlots(now: Date, tz: string): Map<string, string[]> {
  const byDate = new Map<string, string[]>();
  for (let i = 0; i < LOOKBACK_MINUTES; i++) {
    const t = new Date(now.getTime() - i * 60_000);
    const date = localDate(t, tz);
    byDate.set(date, [...(byDate.get(date) ?? []), localTime(t, tz)]);
  }
  return byDate;
}

const select = { id: true, language: true } as const;

export async function runReminders(now = new Date()) {
  const zones = await prisma.user.findMany({ where: reachable, distinct: ["timezone"], select: { timezone: true } });
  const sent = { morning: 0, night: 0, saint: 0 };

  for (const { timezone: tz } of zones) {
    for (const [date, times] of recentSlots(now, tz)) {
      const morning = await prisma.user.findMany({
        where: { ...reachable, timezone: tz, notifyMorning: true, morningTime: { in: times } },
        select,
      });
      sent.morning += await deliver("morning", date, morning, (r) => ({
        ...pushCopy.morning(r.language),
        url: "/prayer?kind=morning&autoplay=1",
      }));

      const night = await prisma.user.findMany({
        where: { ...reachable, timezone: tz, notifyNight: true, nightTime: { in: times } },
        select,
      });
      sent.night += await deliver("night", date, night, (r) => ({ ...pushCopy.night(r.language), url: "/prayer?kind=night&autoplay=1" }));

      if (times.includes(SAINT_OF_DAY_TIME)) sent.saint += await saintOfDay(tz, date);
    }
  }
  return sent;
}

async function saintOfDay(tz: string, date: string) {
  const daily = await prisma.dailyContent.findUnique({ where: { date }, include: { saintOfDay: true } });
  const saint = daily?.saintOfDay;
  if (!saint || saint.deletedAt) return 0;
  const fans: Recipient[] = await prisma.user.findMany({ where: { ...reachable, timezone: tz, notifySaint: true }, select });
  return deliver("saint_of_day", date, fans, (r) => ({
    ...pushCopy.saintOfDay(r.language, saint.name),
    url: `/saint/${saint.id}?autoplay=1`,
    image: saint.imageUrl,
  }));
}

// Día 8: anuncio de la causa ganadora a toda la comunidad (SDD-05, épica 11).
export async function announceVotingResult(month: string, winnerId: string) {
  const cause = await prisma.cause.findUnique({ where: { id: winnerId } });
  if (!cause) return 0;
  const people = await prisma.user.findMany({ where: { ...reachable, notifyCommunity: true }, select });
  return deliver("voting_result", month, people, (r) => ({
    ...pushCopy.votingResult(r.language, r.language === "en" ? cause.nameEn : cause.nameEs),
    url: "/causas",
  }));
}

// Avisos del equipo creados en el panel. El worker los envía; si se corta a medias, se reanuda sin duplicar.
export async function runPendingCampaigns() {
  const campaigns = await prisma.pushCampaign.findMany({ where: { sentAt: null }, orderBy: { createdAt: "asc" } });
  for (const c of campaigns) {
    const people = await prisma.user.findMany({ where: { ...reachable, notifyCommunity: true }, select });
    await deliver("campaign", c.id, people, (r) => ({
      title: r.language === "en" ? c.titleEn : c.titleEs,
      body: r.language === "en" ? c.bodyEn : c.bodyEs,
      url: "/",
    }));
    const recipients = await prisma.pushDelivery.count({ where: { kind: "campaign", ref: c.id } });
    await prisma.pushCampaign.update({ where: { id: c.id }, data: { sentAt: new Date(), recipients } });
  }
  return campaigns.length;
}
