// Nombre público: nombre de pila + inicial del apellido ("María G."). Nunca el email ni el id.
export function publicName(fullName: string | null | undefined): string {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Fiel";
  const first = parts[0]!;
  const initial = parts[1]?.[0];
  return initial ? `${first} ${initial.toUpperCase()}.` : first;
}
