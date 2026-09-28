import type { DailyContent, Saint, User } from "../../generated/prisma/client.ts";
import type { resolvePrayers } from "./prayers.ts";

export function saintDto(s: Saint) {
  return {
    id: s.id,
    name: s.name,
    feastDate: s.feastDate,
    imageUrl: s.imageUrl,
    audioUrl: { es: s.audioUrlEs, en: s.audioUrlEn },
    history: { es: s.historyEs, en: s.historyEn },
    patronages: { es: s.patronagesEs, en: s.patronagesEn },
    prayer: { es: s.prayerEs, en: s.prayerEn },
    isPatronCatalog: s.isPatronCatalog,
  };
}

// Las oraciones llegan ya resueltas: la propia del día o la del tiempo litúrgico (US-10).
export function dailyDto(d: DailyContent & { saintOfDay: Saint | null }, prayers: ReturnType<typeof resolvePrayers>) {
  return {
    date: d.date,
    season: prayers.season,
    saintOfDay: d.saintOfDay ? saintDto(d.saintOfDay) : null,
    gospel: { ref: d.gospelRef, es: d.gospelEs, en: d.gospelEn },
    meditation: { es: d.meditationEs, en: d.meditationEn, audioUrl: { es: d.meditationAudioUrlEs, en: d.meditationAudioUrlEn } },
    morningPrayer: prayers.morning,
    nightPrayer: prayers.night,
  };
}

export function profileDto(u: User, streak: number) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    image: u.image,
    role: u.role,
    onboarded: u.onboarded,
    patronSaintId: u.patronSaintId,
    secondarySaintIds: u.secondarySaintIds,
    language: u.language,
    timezone: u.timezone,
    morningTime: u.morningTime,
    angelusTime: u.angelusTime,
    nightTime: u.nightTime,
    notifyMorning: u.notifyMorning,
    notifyNight: u.notifyNight,
    notifySaint: u.notifySaint,
    notifyCommunity: u.notifyCommunity,
    notifyCandleExpiry: u.notifyCandleExpiry,
    analyticsConsent: u.analyticsConsent,
    streak,
  };
}
