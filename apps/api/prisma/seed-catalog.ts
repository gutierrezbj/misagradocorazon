// Catálogo inicial de santos para un entorno nuevo (SDD-08: "seeds de santos en el primer deploy").
// Apto para producción: solo crea los santos que falten y nunca pisa lo editado desde el panel.
// Sin imágenes (opción B del fundador, 27-nov-2026): las de Wikimedia/Pexels tenían licencias sin
// verificar (docs/fuentes-imagenes.md). La app muestra un marcador propio hasta que se suban
// imágenes verificadas desde el panel.
import { readFileSync } from "node:fs";

import { prisma } from "../src/db.ts";

async function main() {
  const saints = JSON.parse(readFileSync(new URL("./seed-data/saints.json", import.meta.url), "utf8"));
  const { count } = await prisma.saint.createMany({ data: saints, skipDuplicates: true });
  console.log(`Catálogo: ${count} santos nuevos (${saints.length - count} ya existían y no se tocan)`);
}

main().finally(() => prisma.$disconnect());
