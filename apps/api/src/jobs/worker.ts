// Tareas programadas (ADR-013) con pg-boss sobre el mismo PostgreSQL.
// Se ejecuta como proceso aparte: `pnpm --filter @msc/api worker`.
import "../instrument.ts";
import * as Sentry from "@sentry/node";
import { PgBoss } from "pg-boss";

import { env } from "../env.ts";
import { monthOf } from "../lib/dates.ts";
import { refreshKpiDaily } from "../modules/admin/kpi-daily.ts";
import { closeVoting, openVoting } from "../modules/causas/service.ts";
import { announceVotingResult, runCandleExpiryReminders, runPendingCampaigns, runReminders } from "../modules/push/reminders.ts";
import { processReceipts } from "../modules/push/service.ts";
import { processAppleRevocations } from "../modules/users/apple-tokens.ts";

const QUEUES = {
  openVoting: "voting-open",
  closeVoting: "voting-close",
  pushReminders: "push-reminders",
  pushCampaigns: "push-campaigns",
  pushReceipts: "push-receipts",
  kpiDaily: "kpi-daily",
  appleRevocations: "apple-revocations",
} as const;

async function main() {
  const boss = new PgBoss(env.DATABASE_URL);
  boss.on("error", (err) => {
    console.error("pg-boss", err);
    Sentry.captureException(err);
  });
  await boss.start();

  for (const q of Object.values(QUEUES)) await boss.createQueue(q);

  // Horas en UTC: la ventana de votación es del día 1 al 7 (shared/VOTING_WINDOW).
  await boss.schedule(QUEUES.openVoting, "5 0 1 * *", null, { tz: "UTC" });
  await boss.schedule(QUEUES.closeVoting, "5 0 8 * *", null, { tz: "UTC" });
  // Push: recordatorios y avisos cada minuto (hora local de cada fiel); recibos de Expo cada 15 min.
  await boss.schedule(QUEUES.pushReminders, "* * * * *", null, { tz: "UTC" });
  await boss.schedule(QUEUES.pushCampaigns, "* * * * *", null, { tz: "UTC" });
  await boss.schedule(QUEUES.pushReceipts, "*/15 * * * *", null, { tz: "UTC" });
  // Agregados diarios de KPIs: cerrado el día UTC anterior.
  await boss.schedule(QUEUES.kpiDaily, "20 0 * * *", null, { tz: "UTC" });
  // Tokens de Apple de cuentas borradas que no se pudieron revocar al momento.
  await boss.schedule(QUEUES.appleRevocations, "*/15 * * * *", null, { tz: "UTC" });

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
    const expired = await runCandleExpiryReminders();
    if (expired > 0) console.log("avisos de vela apagada", expired);
  });
  await boss.work(QUEUES.pushCampaigns, async () => {
    const n = await runPendingCampaigns();
    if (n > 0) console.log("campañas enviadas", n);
  });
  await boss.work(QUEUES.pushReceipts, async () => {
    const r = await processReceipts();
    if (r.checked > 0) console.log("recibos de push", r);
  });

  await boss.work(QUEUES.kpiDaily, async () => {
    console.log("agregados diarios", await refreshKpiDaily());
  });

  await boss.work(QUEUES.appleRevocations, async () => {
    const r = await processAppleRevocations();
    if (r.revoked + r.failed > 0) console.log("revocaciones de Apple", r);
  });

  console.log("Worker de tareas programadas en marcha");

  // Al redesplegar, Railway envía SIGTERM: se terminan los trabajos en curso antes de salir.
  const stop = async (signal: string) => {
    console.log(`${signal}: parando el worker`);
    await boss.stop({ graceful: true, timeout: 20_000 }).catch((err: unknown) => console.error(err));
    process.exit(0);
  };
  process.once("SIGTERM", () => void stop("SIGTERM"));
  process.once("SIGINT", () => void stop("SIGINT"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
