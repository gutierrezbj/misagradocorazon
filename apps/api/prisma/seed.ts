// Seed de desarrollo. NUNCA se ejecuta al arrancar la API ni en producción.
// Carga el catálogo de santos y contenido diario de ejemplo para hoy y ayer.
import { readFileSync } from "node:fs";

import { prisma } from "../src/db.ts";
import { localDate } from "../src/lib/dates.ts";

type SaintSeed = {
  id: string;
  name: string;
  feastDate: string;
  imageUrl: string;
  sortOrder: number;
  isPatronCatalog: boolean;
  historyEs: string;
  historyEn: string;
  patronagesEs: string;
  patronagesEn: string;
  prayerEs: string;
  prayerEn: string;
};

type DailySeed = {
  saintRotation: string[];
  template: {
    gospelRef: string;
    gospelEs: string;
    gospelEn: string;
    meditationEs: string;
    meditationEn: string;
    morningPrayerEs: string;
    morningPrayerEn: string;
    nightPrayerEs: string;
    nightPrayerEn: string;
  };
};

const readJson = <T>(file: string): T => JSON.parse(readFileSync(new URL(`./seed-data/${file}`, import.meta.url), "utf8")) as T;

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("El seed de desarrollo no se ejecuta en producción");

  const saints = readJson<SaintSeed[]>("saints.json");
  for (const s of saints) {
    await prisma.saint.upsert({ where: { id: s.id }, create: s, update: s });
  }

  const daily = readJson<DailySeed>("daily-dev.json");
  const now = new Date();
  for (const [offset, saintId] of daily.saintRotation.entries()) {
    const date = localDate(new Date(now.getTime() - offset * 86_400_000), "America/Mexico_City");
    const data = { ...daily.template, saintOfDayId: saintId };
    await prisma.dailyContent.upsert({ where: { date }, create: { date, ...data }, update: data });
  }

  console.log(`Seed: ${saints.length} santos, ${daily.saintRotation.length} días de contenido`);
}

main().finally(() => prisma.$disconnect());
