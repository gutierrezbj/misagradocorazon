// Oraciones de mañana y noche según el tiempo litúrgico (SDD-05 US-10).
// Un día con oración propia la usa (texto y audio). Si no, la del tiempo litúrgico de esa fecha y,
// si ese tiempo aún no tiene set, la del tiempo ordinario.
import { liturgicalSeason, type LiturgicalSeason, type VoiceCredit } from "@msc/shared";

import { prisma } from "../../db.ts";
import type { DailyContent, PrayerKind, SeasonalPrayer } from "../../generated/prisma/client.ts";
import { audioVoice } from "./serializers.ts";

export type ResolvedPrayer = {
  es: string;
  en: string;
  audioUrl: { es: string | null; en: string | null };
  audioVoice: { es: VoiceCredit | null; en: VoiceCredit | null };
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
  | "morningAudioVoiceEs"
  | "morningAudioVoiceEn"
  | "nightAudioVoiceEs"
  | "nightAudioVoiceEn"
>;

export function resolvePrayers(day: DayPrayers, sets: Map<string, SeasonalPrayer>) {
  const season = liturgicalSeason(day.date);
  const pick = (kind: PrayerKind): ResolvedPrayer | null => {
    const es = day[`${kind}PrayerEs`];
    const en = day[`${kind}PrayerEn`];
    if (es && en) {
      const [urlEs, urlEn] = [day[`${kind}AudioUrlEs`], day[`${kind}AudioUrlEn`]];
      return {
        es,
        en,
        audioUrl: { es: urlEs, en: urlEn },
        audioVoice: audioVoice(urlEs, day[`${kind}AudioVoiceEs`], urlEn, day[`${kind}AudioVoiceEn`]),
        source: "day",
      };
    }
    const set = sets.get(`${season}:${kind}`) ?? sets.get(`ordinary:${kind}`);
    if (!set) return null;
    return {
      es: set.textEs,
      en: set.textEn,
      audioUrl: { es: set.audioUrlEs, en: set.audioUrlEn },
      audioVoice: audioVoice(set.audioUrlEs, set.audioVoiceEs, set.audioUrlEn, set.audioVoiceEn),
      source: "season",
    };
  };
  const [morning, night] = KINDS.map(pick);
  return { season, morning: morning ?? null, night: night ?? null };
}
