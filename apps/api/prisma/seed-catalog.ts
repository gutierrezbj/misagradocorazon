// Catálogo inicial de santos para un entorno nuevo (SDD-08: "seeds de santos en el primer deploy").
// Apto para producción: solo crea los santos que falten y nunca pisa lo editado desde el panel.
// Las imágenes enlazan a Wikimedia/Pexels con licencias pendientes de verificar (docs/fuentes-imagenes.md):
// hay que sustituirlas desde el panel, subiéndolas a R2, antes de publicar.
import { readFileSync } from "node:fs";

import { prisma } from "../src/db.ts";

async function main() {
  const saints = JSON.parse(readFileSync(new URL("./seed-data/saints.json", import.meta.url), "utf8"));
  const { count } = await prisma.saint.createMany({ data: saints, skipDuplicates: true });
  console.log(`Catálogo: ${count} santos nuevos (${saints.length - count} ya existían y no se tocan)`);
}

main().finally(() => prisma.$disconnect());
