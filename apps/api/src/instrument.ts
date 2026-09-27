// Monitorización de errores con Sentry (SDD-08, decisión del fundador 27-sep-2026).
// Se importa lo primero en el servidor y en el worker. Sin SENTRY_DSN no hace nada.
// Nada personal sale de aquí: scrubEvent quita cuerpos, cabeceras, usuario e IP (GDPR art. 9).
import * as Sentry from "@sentry/node";
import { scrubEvent } from "@msc/shared";

const dsn = process.env.SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend: (event) => scrubEvent(event),
    beforeSendTransaction: () => null,
  });
}
