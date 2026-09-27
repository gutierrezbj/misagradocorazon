// Mensaje para un error de la API, según lo que ha pasado de verdad:
// - fetch no llegó al servidor (sin conexión o servidor caído) → "sin conexión";
// - 429, límite de uso (API o login) → "espera un momento";
// - lo demás → mensaje genérico. Cada pantalla trata antes sus códigos propios (ya votaste, email en uso...).
import { ApiError } from "@/src/api";

export type ErrorKey = "networkError" | "tooFast" | "genericError";

export function errorKey(e: unknown): ErrorKey {
  if (e instanceof ApiError) return e.status === 429 || e.code === "rate_limited" ? "tooFast" : "genericError";
  return "networkError";
}
