// Importes en USD a partir de céntimos, en el formato del idioma del fiel.
// Céntimos solo cuando los hay: $6,000 y $1,500.50.
export function formatUsd(cents: number, lang: "es" | "en") {
  const digits = cents % 100 === 0 ? 0 : 2;
  return `$${(cents / 100).toLocaleString(lang === "en" ? "en-US" : "es-MX", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}
