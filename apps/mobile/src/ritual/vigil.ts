// La vela en pantalla (SDD-05 US-31): cálculos puros, sin React, para poder probarlos solos.

/** Minutos que la pantalla se queda encendida. 1 h por defecto (aprobado el 28-nov-2026). */
export const VIGIL_TIMERS = [30, 60, 480] as const;
export type VigilTimer = (typeof VIGIL_TIMERS)[number];
export const DEFAULT_VIGIL_TIMER: VigilTimer = 60;

/** Lo que le queda a la vela, de 1 (recién encendida) a 0 (consumida). */
export function remainingFraction(litAt: string, expiresAt: string, now: number): number {
  const start = Date.parse(litAt);
  const end = Date.parse(expiresAt);
  if (!(end > start)) return 0;
  return Math.min(1, Math.max(0, (end - now) / (end - start)));
}

/** Altura de la cera que se pinta: siempre queda un resto en el fondo, también al consumirse. */
export const waxLevel = (fraction: number) => 0.12 + 0.88 * Math.min(1, Math.max(0, fraction));

/** Días, horas y minutos que quedan, redondeando los minutos hacia arriba. */
export function remainingParts(ms: number): { days: number; hours: number; minutes: number } {
  const total = Math.max(0, Math.ceil(ms / 60_000));
  return { days: Math.floor(total / 1440), hours: Math.floor((total % 1440) / 60), minutes: total % 60 };
}

// La llama se desplaza unos píxeles cada pocos minutos para no marcar la pantalla.
export const DRIFT_EVERY_MS = 3 * 60_000;
const DRIFT: readonly [number, number][] = [
  [0, 0],
  [6, -4],
  [-5, 5],
  [4, 6],
  [-6, -3],
];
export const driftOffset = (step: number) => DRIFT[((step % DRIFT.length) + DRIFT.length) % DRIFT.length];
