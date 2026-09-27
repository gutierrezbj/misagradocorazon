// Monitorización de errores del panel con Sentry (SDD-08, 27-sep-2026). Sin VITE_SENTRY_DSN no hace nada.
// Sin datos personales: scrubEvent quita cuerpos, cabeceras, usuario e IP. Sin sesiones (Sentry
// deduciría la IP del navegador) ni trazas de rendimiento.
import * as Sentry from "@sentry/react";
import { scrubEvent } from "@msc/shared";

const dsn = import.meta.env.VITE_SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    integrations: (defaults) => defaults.filter((i) => i.name !== "BrowserSession"),
    beforeSend: (event) => scrubEvent(event),
  });
}
