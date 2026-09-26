// Tareas programadas (ADR-013) con pg-boss sobre el mismo PostgreSQL.
// Se ejecuta como proceso aparte: `pnpm --filter @msc/api worker`.
import { PgBoss } from "pg-boss";

import { env } from "../env.ts";
import { monthOf } from "../lib/dates.ts";
import { closeVoting, openVoting } from "../modules/causas/service.ts";

const QUEUES = {
  openVoting: "voting-open",
  closeVoting: "voting-close",
} as const;

async function main() {
  const boss = new PgBoss(env.DATABASE_URL);
  boss.on("error", (err) => console.error("pg-boss", err));
  await boss.start();

  for (const q of Object.values(QUEUES)) await boss.createQueue(q);

  // Horas en UTC: la ventana de votación es del día 1 al 7 (shared/VOTING_WINDOW).
  await boss.schedule(QUEUES.openVoting, "5 0 1 * *", null, { tz: "UTC" });
  await boss.schedule(QUEUES.closeVoting, "5 0 8 * *", null, { tz: "UTC" });

  await boss.work(QUEUES.openVoting, async () => {
    const r = await openVoting(monthOf(new Date()));
    console.log("votación abierta", r);
  });
  await boss.work(QUEUES.closeVoting, async () => {
    const r = await closeVoting(monthOf(new Date()));
    console.log("votación cerrada", r);
    // Siguiente bloque: push a toda la comunidad con la causa ganadora.
  });

  console.log("Worker de tareas programadas en marcha");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
