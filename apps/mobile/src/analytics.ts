// Analítica de producto con PostHog (ADR-011): embudos, retención y cohortes.
// Reglas (GDPR art. 9, CLAUDE.md):
// - Solo con consentimiento explícito del fiel (User.analyticsConsent); sin él no sale nada del móvil.
// - Nunca texto libre: ni intenciones, ni mensajes, ni nombres, ni email. Los eventos están tipados
//   y sus propiedades son valores cerrados (tipo de vela, categoría...).
// - Se identifica solo por el id interno. Sin geolocalización por IP, sin grabación de sesiones.
// - Sin EXPO_PUBLIC_POSTHOG_KEY la analítica está apagada (desarrollo, tests, builds sin cuenta).
import PostHog from "posthog-react-native";
import type { CandleType, IntentionCategory, LiturgicalSeason } from "@msc/shared";

/** Todos los eventos que existen. Añadir uno aquí es la única forma de enviarlo. */
export type AnalyticsEvents = {
  onboarding_completed: { language: "es" | "en"; secondarySaints: number };
  prayer_completed: { kind: "morning" | "night"; season: LiturgicalSeason };
  audio_played: { content: "saint" | "morning" | "night" | "meditation" };
  // Mini-player de las pestañas: volver al audio, pausar/reanudar o cerrarlo.
  mini_player_used: { action: "open" | "toggle" | "close" };
  candle_flow_started: Record<string, never>;
  candle_lit: { type: CandleType; forDeceased: boolean };
  candle_shared: { withIntention: boolean };
  intention_posted: { category: IntentionCategory; moderated: boolean };
  intention_prayed: Record<string, never>;
  vote_cast: Record<string, never>;
  // Recuperar contraseña (US-24): embudo de código pedido → contraseña cambiada.
  password_reset_requested: Record<string, never>;
  password_reset_completed: Record<string, never>;
  cause_opened: Record<string, never>;
  mass_opened: { status: "scheduled" | "live" | "ended" };
  // Grabación de la última misa (pilar 2): dentro de la app (YouTube) o fuera.
  recording_opened: { inApp: boolean };
  chat_message_sent: Record<string, never>;
};

const KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY ?? "";
const HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";
const MAX_PENDING = 50;

type Pending = { event: string; props?: Record<string, string | number | boolean> } | { screen: string };

// El cliente no existe hasta que hay consentimiento: así ni siquiera se contacta con PostHog antes.
let client: PostHog | null = null;
// Al arrancar, el consentimiento se conoce cuando carga el perfil; lo registrado antes espera aquí.
let consent: "unknown" | "granted" | "denied" = "unknown";
let pending: Pending[] = [];

function createClient() {
  client ??= new PostHog(KEY, {
    host: HOST,
    defaultOptIn: false,
    disableGeoip: true,
    enableSessionReplay: false,
    captureAppLifecycleEvents: true, // aperturas de la app: base de la retención
    personProfiles: "identified_only",
    // Solo eventos: sin feature flags ni encuestas.
    preloadFeatureFlags: false,
    disableRemoteFeatureFlags: true,
    disableSurveys: true,
  });
  return client;
}

function send(item: Pending) {
  if (!KEY || consent === "denied") return;
  if (consent === "unknown" || !client) {
    if (pending.length < MAX_PENDING) pending.push(item);
    return;
  }
  if ("screen" in item) void client.screen(item.screen);
  else client.capture(item.event, item.props);
}

export function track<E extends keyof AnalyticsEvents>(event: E, ...props: AnalyticsEvents[E] extends Record<string, never> ? [] : [AnalyticsEvents[E]]) {
  send({ event, props: props[0] as Record<string, string | number | boolean> | undefined });
}

/** Pantallas por su ruta genérica ("saint/[id]"), nunca con ids ni datos. */
export function trackScreen(route: string) {
  send({ screen: route });
}

/** Aplica el consentimiento guardado en el perfil. Se llama al cargar el usuario y al cambiarlo. */
export async function applyAnalyticsConsent(user: { id: string; analyticsConsent: boolean } | null) {
  if (!KEY) return;
  if (user?.analyticsConsent) {
    const ph = createClient();
    await ph.optIn();
    if (ph.getDistinctId() !== user.id) ph.identify(user.id);
    consent = "granted";
    const queued = pending;
    pending = [];
    queued.forEach(send);
  } else {
    consent = "denied";
    pending = [];
    if (client) {
      // Al retirar el consentimiento, cerrar sesión o borrar la cuenta: se olvida la identidad local.
      client.reset();
      await client.optOut();
    }
  }
}
