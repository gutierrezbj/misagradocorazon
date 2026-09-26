// Fechas locales del usuario. El servidor trabaja en UTC; "hoy" depende de la zona del fiel.

export function localDate(date: Date, timeZone: string): string {
  // en-CA formatea como YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export function localTime(date: Date, timeZone: string): string {
  // HH:MM en 24 h (h23 evita "24:00" a medianoche).
  return new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date);
}

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function previousDay(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

// Racha de constancia: días consecutivos con al menos una oración completada.
// Si hoy aún no ha rezado, la racha de ayer sigue viva.
export function streakFromDates(datesWithPrayer: Iterable<string>, today: string): number {
  const days = new Set(datesWithPrayer);
  let cursor = days.has(today) ? today : previousDay(today);
  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor = previousDay(cursor);
  }
  return streak;
}

export function monthOf(date: Date): string {
  return date.toISOString().slice(0, 7);
}
