import { prisma } from "../../db.ts";

// Minúsculas, sin tildes y con espacios colapsados: "Brujería" y "brujeria" son lo mismo.
export function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export async function containsBannedWord(text: string): Promise<boolean> {
  const words = await prisma.moderationWord.findMany({ select: { word: true } });
  const normalized = normalizeText(text);
  return words.some(({ word }) => normalized.includes(word));
}
