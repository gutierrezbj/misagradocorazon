import { HttpError } from "../http.ts";

// Limitador en memoria por clave. Suficiente para una instancia; con varias réplicas pasará a Redis.
const last = new Map<string, number>();

export function assertRateLimit(key: string, minIntervalMs: number, now = Date.now()) {
  const prev = last.get(key);
  if (prev !== undefined && now - prev < minIntervalMs) {
    throw new HttpError(429, "rate_limited", "Demasiadas peticiones, espera un momento");
  }
  last.set(key, now);
}

export function resetRateLimits() {
  last.clear();
}
