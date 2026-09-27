// Monitorización de errores de la app con Sentry (SDD-08, decisión del fundador 27-sep-2026).
// Sin EXPO_PUBLIC_SENTRY_DSN no hace nada (desarrollo, tests, builds sin cuenta).
// Sin datos personales (GDPR art. 9): scrubEvent quita cuerpos, cabeceras, usuario e IP; sin
// sesiones (Sentry deduciría la IP), sin capturas de pantalla ni jerarquía de vistas, sin trazas.
import * as Sentry from "@sentry/react-native";
import { scrubEvent } from "@msc/shared";

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT ?? (__DEV__ ? "development" : "production"),
    sendDefaultPii: false,
    enableAutoSessionTracking: false,
    attachScreenshot: false,
    attachViewHierarchy: false,
    tracesSampleRate: 0,
    beforeSend: (event) => scrubEvent(event),
  });
}

/** Para errores capturados a mano (p. ej. la pantalla de error). Sin DSN no hace nada. */
export function reportError(error: unknown) {
  if (dsn) Sentry.captureException(error);
}
