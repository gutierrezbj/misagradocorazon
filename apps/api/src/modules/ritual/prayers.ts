// Oraciones de mañana y noche según el tiempo litúrgico (SDD-05 US-10).
// Un día con oración propia la usa (texto y audio). Si no, la del tiempo litúrgico de esa fecha y,
// si ese tiempo aún no tiene set, la del tiempo ordinario.
import { liturgicalSeason, type LiturgicalSeason } from "@msc/shared";

import { prisma } from "../../db.ts";
import type { DailyContent, PrayerKind, SeasonalPrayer } from "../../generated/prisma/client.ts";

export type ResolvedPrayer = {
  es: string;
  en: string;
  audioUrl: { es: string | null; en: string | null };
  source: "day" | "season";
};

const KINDS = ["morning", "night"] as const satisfies readonly PrayerKind[];

export async function seasonalPrayers(seasons: LiturgicalSeason[]) {
  const rows = await prisma.seasonalPrayer.findMany({ where: { season: { in: [...new Set([...seasons, "ordinary" as const])] } } });
  return new Map(rows.map((r) => [`${r.season}:${r.kind}`, r]));
}

type DayPrayers = Pick<
  DailyContent,
  | "date"
  | "morningPrayerEs"
  | "morningPrayerEn"
  | "nightPrayerEs"
  | "nightPrayerEn"
  | "morningAudioUrlEs"
  | "morningAudioUrlEn"
  | "nightAudioUrlEs"
  | "nightAudioUrlEn"
>;

export function resolvePrayers(day: DayPrayers, sets: Map<string, SeasonalPrayer>) {
  const season = liturgicalSeason(day.date);
  const pick = (kind: PrayerKind): ResolvedPrayer | null => {
    const es = day[`${kind}PrayerEs`];
    const en = day[`${kind}PrayerEn`];
    if (es && en) {
      return { es, en, audioUrl: { es: day[`${kind}AudioUrlEs`], en: day[`${kind}AudioUrlEn`] }, source: "day" };
    }
    const set = sets.get(`${season}:${kind}`) ?? sets.get(`ordinary:${kind}`);
    return set ? { es: set.textEs, en: set.textEn, audioUrl: { es: set.audioUrlEs, en: set.audioUrlEn }, source: "season" } : null;
  };
  const [morning, night] = KINDS.map(pick);
  return { season, morning: morning ?? null, night: night ?? null };
}
