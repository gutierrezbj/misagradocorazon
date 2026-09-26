// Tareas programadas (ADR-013) con pg-boss sobre el mismo PostgreSQL.
// Se ejecuta como proceso aparte: `pnpm --filter @msc/api worker`.
import { PgBoss } from "pg-boss";

import { env } from "../env.ts";
import { monthOf } from "../lib/dates.ts";
import { closeVoting, openVoting } from "../modules/causas/service.ts";
import { announceVotingResult, runPendingCampaigns, runReminders } from "../modules/push/reminders.ts";
import { processReceipts } from "../modules/push/service.ts";

const QUEUES = {
  openVoting: "voting-open",
  closeVoting: "voting-close",
  pushReminders: "push-reminders",
  pushCampaigns: "push-campaigns",
  pushReceipts: "push-receipts",
} as const;

async function main() {
  const boss = new PgBoss(env.DATABASE_URL);
  boss.on("error", (err) => console.error("pg-boss", err));
  await boss.start();

  for (const q of Object.values(QUEUES)) await boss.createQueue(q);

  // Horas en UTC: la ventana de votación es del día 1 al 7 (shared/VOTING_WINDOW).
  await boss.schedule(QUEUES.openVoting, "5 0 1 * *", null, { tz: "UTC" });
  await boss.schedule(QUEUES.closeVoting, "5 0 8 * *", null, { tz: "UTC" });
  // Push: recordatorios y avisos cada minuto (hora local de cada fiel); recibos de Expo cada 15 min.
  await boss.schedule(QUEUES.pushReminders, "* * * * *", null, { tz: "UTC" });
  await boss.schedule(QUEUES.pushCampaigns, "* * * * *", null, { tz: "UTC" });
  await boss.schedule(QUEUES.pushReceipts, "*/15 * * * *", null, { tz: "UTC" });

  await boss.work(QUEUES.openVoting, async () => {
    const r = await openVoting(monthOf(new Date()));
    console.log("votación abierta", r);
  });
  await boss.work(QUEUES.closeVoting, async () => {
    const r = await closeVoting(monthOf(new Date()));
    console.log("votación cerrada", r);
    if (r.winnerId) console.log("aviso de causa ganadora", await announceVotingResult(monthOf(new Date()), r.winnerId));
  });
  await boss.work(QUEUES.pushReminders, async () => {
    const r = await runReminders();
    if (r.morning + r.night + r.saint > 0) console.log("recordatorios enviados", r);
  });
  await boss.work(QUEUES.pushCampaigns, async () => {
    const n = await runPendingCampaigns();
    if (n > 0) console.log("campañas enviadas", n);
  });
  await boss.work(QUEUES.pushReceipts, async () => {
    const r = await processReceipts();
    if (r.checked > 0) console.log("recibos de push", r);
  });

  console.log("Worker de tareas programadas en marcha");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
