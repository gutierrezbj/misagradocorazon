import { prisma } from "../../db.ts";
import { localDate, streakFromDates } from "../../lib/dates.ts";

export async function currentStreak(userId: string, timeZone: string, now = new Date()): Promise<number> {
  // 400 días cubren más de un año de racha sin cargar todo el histórico.
  const logs = await prisma.prayerLog.findMany({
    where: { userId },
    select: { localDate: true },
    distinct: ["localDate"],
    orderBy: { localDate: "desc" },
    take: 400,
  });
  return streakFromDates(
    logs.map((l) => l.localDate),
    localDate(now, timeZone),
  );
}
