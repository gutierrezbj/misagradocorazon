import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

import { storage } from "@/src/utils/storage";

export type Lang = "es" | "en";
const LANG_KEY = "msc.lang";

const dict = {
  // conexión con la API nueva (26-sep-2026)
  emailPlaceholder: { es: "tu@correo.com", en: "you@email.com" },
  emailTaken: { es: "Ya existe una cuenta con ese correo", en: "An account with that email already exists" },
  passwordTooShort: { es: "La contraseña debe tener al menos 8 caracteres", en: "Password must be at least 8 characters" },
  longPressHint: { es: "mantén pulsado para añadir", en: "long press to add" },
  pushNote: { es: "Los recordatorios llegan en la app instalada desde las tiendas.", en: "Reminders arrive in the app installed from the stores." },
  pushAsk: { es: "Activa las notificaciones para recibir tus recordatorios de oración.", en: "Turn on notifications to receive your prayer reminders." },
  pushEnable: { es: "Activar notificaciones", en: "Turn on notifications" },
  pushDenied: { es: "Las notificaciones están desactivadas en los ajustes del teléfono.", en: "Notifications are turned off in your phone settings." },
  pushOpenSettings: { es: "Abrir ajustes", en: "Open settings" },
  pushCommunity: { es: "Avisos de la comunidad", en: "Community notices" },
  genericError: { es: "Algo ha fallado. Inténtalo de nuevo.", en: "Something went wrong. Please try again." },
  networkError: { es: "Sin conexión. Inténtalo de nuevo cuando vuelvas a tener red.", en: "No connection. Try again when you're back online." },
  pushCommunityHint: { es: "Causa del mes y avisos del equipo", en: "Cause of the month and team notices" },
  information: { es: "Información", en: "Information" },
  meditation: { es: "Meditación", en: "Meditation" },
  history: { es: "Historia", en: "History" },
  patronages: { es: "Advocaciones", en: "Patronages" },
  prayerLabel: { es: "Oración", en: "Prayer" },
  amenComplete: { es: "Amén · Completar", en: "Amen · Complete" },
  candlesLabel: { es: "velas", en: "candles" },
  votesLabel: { es: "votos", en: "votes" },
  audioPlay: { es: "Reproducir", en: "Play" },
  audioPause: { es: "Pausar", en: "Pause" },
  audioBack15: { es: "Retroceder 15 segundos", en: "Back 15 seconds" },
  audioForward15: { es: "Avanzar 15 segundos", en: "Forward 15 seconds" },
  audioProgress: { es: "Progreso del audio", en: "Audio progress" },
  audioError: { es: "No se pudo cargar el audio.", en: "The audio could not be loaded." },
  privateIntentions: { es: "Mis intenciones privadas", en: "My private intentions" },
  privateIntentionsShort: { es: "Por quién rezo · solo tú las ves", en: "Who I pray for · only you see them" },
  privateIntentionsNote: {
    es: "Solo tú puedes verlas. Se guardan cifradas y nunca se publican ni se comparten.",
    en: "Only you can see them. They are stored encrypted and never published or shared.",
  },
  privateIntentionPlaceholder: { es: "Por quién o por qué rezo hoy…", en: "Who or what I pray for today…" },
  addIntention: { es: "Guardar intención", en: "Save intention" },
  noPrivateIntentions: { es: "Aún no has guardado ninguna intención.", en: "You haven't saved any intentions yet." },
  delete: { es: "Borrar", en: "Delete" },
  candleWall: { es: "Muro de velas", en: "Candle wall" },
  candlesLitToday: { es: "{n} velas encendidas hoy", en: "{n} candles lit today" },
  candleWallLead: { es: "No rezas solo: estas velas arden ahora por las intenciones de la comunidad.", en: "You don't pray alone: these candles are burning now for the community's intentions." },
  wallToday: { es: "hoy", en: "today" },
  wallLitNow: { es: "encendidas ahora", en: "lit now" },
  wallThisWeek: { es: "esta semana", en: "this week" },
  candleWallEmpty: { es: "Aún no hay velas encendidas. Enciende la primera.", en: "No candles lit yet. Light the first one." },
  wallMore: { es: "y {n} velas más", en: "and {n} more candles" },
  shareCandle: { es: "Compartir mi vela", en: "Share my candle" },
  shareTitle: { es: "Reza acompañado", en: "Pray together" },
  shareSub: { es: "Invita a tu familia a rezar contigo por WhatsApp o en tus estados.", en: "Invite your family to pray with you on WhatsApp or in your stories." },
  shareLitFor: { es: "He encendido una vela a", en: "I lit a candle to" },
  sharePrayWithMe: { es: "Enciende una vela conmigo", en: "Light a candle with me" },
  shareIncludeIntention: { es: "Incluir mi intención", en: "Include my intention" },
  shareIncludeIntentionHint: { es: "Quien reciba la imagen podrá leerla.", en: "Anyone who receives the image will be able to read it." },
  shareNow: { es: "Compartir", en: "Share" },
  shareDialogTitle: { es: "Compartir mi vela", en: "Share my candle" },
  shareUnavailable: { es: "Este dispositivo no permite compartir.", en: "This device cannot share." },
  tooFast: { es: "Espera un momento antes de volver a enviar", en: "Please wait a moment before sending again" },
  // generic
  appName: { es: "Mi Sagrado Corazón", en: "My Sacred Heart" },
  tagline: { es: "La comunidad de fe que enciende el mundo", en: "The community of faith that lights the world" },
  continue: { es: "Continuar", en: "Continue" },
  save: { es: "Guardar", en: "Save" },
  cancel: { es: "Cancelar", en: "Cancel" },
  retry: { es: "Reintentar", en: "Retry" },
  loading: { es: "Cargando…", en: "Loading…" },
  back: { es: "Volver", en: "Back" },
  send: { es: "Enviar", en: "Send" },
  close: { es: "Cerrar", en: "Close" },
  // auth
  welcome: { es: "Bienvenido", en: "Welcome" },
  signIn: { es: "Iniciar sesión", en: "Sign in" },
  signUp: { es: "Crear cuenta", en: "Create account" },
  email: { es: "Correo electrónico", en: "Email" },
  password: { es: "Contraseña", en: "Password" },
  name: { es: "Nombre", en: "Name" },
  continueGoogle: { es: "Continuar con Google", en: "Continue with Google" },
  orDivider: { es: "o", en: "or" },
  socialError: { es: "No pudimos iniciar sesión. Inténtalo de nuevo.", en: "We couldn't sign you in. Please try again." },
  socialLinkBlocked: {
    es: "Ya tienes una cuenta con ese correo. Entra con tu contraseña.",
    en: "You already have an account with that email. Sign in with your password.",
  },
  noAccount: { es: "¿No tienes cuenta? Regístrate", en: "No account? Sign up" },
  haveAccount: { es: "¿Ya tienes cuenta? Inicia sesión", en: "Already have an account? Sign in" },
  logout: { es: "Cerrar sesión", en: "Log out" },
  authError: { es: "No pudimos verificar tus datos.", en: "We could not verify your details." },
  // onboarding
  chooseSaint: { es: "Elige tu santo patrón", en: "Choose your patron saint" },
  chooseSaintSub: { es: "Toda tu experiencia girará en torno a él", en: "Your whole experience will center on them" },
  secondarySaints: { es: "Santos secundarios (opcional)", en: "Secondary saints (optional)" },
  prayerTimes: { es: "Horarios de oración", en: "Prayer times" },
  morning: { es: "Mañana", en: "Morning" },
  angelus: { es: "Ángelus", en: "Angelus" },
  night: { es: "Noche", en: "Night" },
  language: { es: "Idioma", en: "Language" },
  finish: { es: "Entrar a mi altar", en: "Enter my altar" },
  // tabs
  tabAltar: { es: "Altar", en: "Altar" },
  tabMuro: { es: "Muro", en: "Wall" },
  tabMisa: { es: "Misa", en: "Mass" },
  tabCausas: { es: "Causas", en: "Causes" },
  // altar
  greetingMorning: { es: "Buenos días", en: "Good morning" },
  greetingAfternoon: { es: "Buenas tardes", en: "Good afternoon" },
  greetingEvening: { es: "Buenas noches", en: "Good evening" },
  streakDays: { es: "días de constancia", en: "day streak" },
  lightCandle: { es: "Encender una vela", en: "Light a candle" },
  myCandles: { es: "Mis velas encendidas", en: "My lit candles" },
  gospelToday: { es: "Evangelio de hoy", en: "Today's Gospel" },
  saintOfDay: { es: "Santo del día", en: "Saint of the day" },
  morningPrayer: { es: "Oración de la mañana", en: "Morning prayer" },
  nightPrayer: { es: "Oración de la noche", en: "Night prayer" },
  // tiempo litúrgico (US-10)
  season_advent: { es: "Tiempo de Adviento", en: "Advent" },
  season_christmas: { es: "Tiempo de Navidad", en: "Christmas Time" },
  season_lent: { es: "Cuaresma", en: "Lent" },
  season_easter: { es: "Tiempo de Pascua", en: "Easter Time" },
  season_ordinary: { es: "Tiempo ordinario", en: "Ordinary Time" },
  prayerUnavailable: { es: "La oración de hoy aún no está disponible.", en: "Today's prayer is not available yet." },
  noCandles: { es: "Aún no has encendido ninguna vela", en: "You haven't lit any candles yet" },
  selectPatronFirst: { es: "Selecciona tu santo patrón", en: "Select your patron saint" },
  // candle
  lightCandleTitle: { es: "Encender una vela", en: "Light a candle" },
  forWhichSaint: { es: "¿A qué santo?", en: "To which saint?" },
  yourIntention: { es: "Tu intención", en: "Your intention" },
  intentionPlaceholder: { es: "Por quién o por qué enciendes esta vela…", en: "Who or what you light this candle for…" },
  candleType: { es: "Tipo de vela", en: "Candle type" },
  candleBasic: { es: "Vela básica", en: "Basic candle" },
  candleSolemn: { es: "Vela solemne", en: "Solemn candle" },
  candlePermanent: { es: "Vela permanente", en: "Permanent candle" },
  candleBasicDesc: { es: "Encendida 24 horas por tu intención", en: "Lit for 24 hours for your intention" },
  candleSolemnDesc: { es: "Llama solemne, encendida 3 días", en: "Solemn flame, lit for 3 days" },
  candlePermanentDesc: { es: "Encendida toda una semana", en: "Lit for a whole week" },
  lightNow: { es: "Encender vela", en: "Light candle" },
  candleLit: { es: "Tu vela está encendida", en: "Your candle is lit" },
  candleLitSub: { es: "Tu intención se eleva ahora en el altar", en: "Your intention now rises on the altar" },
  simulatedPayment: { es: "Pago simulado en esta versión de prueba", en: "Simulated payment in this preview" },
  impactNote: { es: "El 20% de la facturación mensual se destina a la causa del mes", en: "20% of monthly revenue goes to the cause of the month" },
  forDeceased: { es: "Enciendo esta vela por un difunto", en: "I light this candle for a deceased soul" },
  intentionRequired: { es: "Escribe una intención", en: "Write an intention" },
  // muro
  wallTitle: { es: "Muro de intenciones", en: "Prayer wall" },
  prayForYou: { es: "Rezo por ti", en: "I pray for you" },
  prayed: { es: "Rezaste", en: "You prayed" },
  shareIntention: { es: "Compartir una intención", en: "Share an intention" },
  publish: { es: "Publicar", en: "Publish" },
  catAll: { es: "Todas", en: "All" },
  catSalud: { es: "Salud", en: "Health" },
  catFamilia: { es: "Familia", en: "Family" },
  catTrabajo: { es: "Trabajo", en: "Work" },
  catDifuntos: { es: "Difuntos", en: "Deceased" },
  catAgradecimiento: { es: "Gracias", en: "Thanks" },
  wallEmpty: { es: "Sé el primero en compartir una intención hoy.", en: "Be the first to share an intention today." },
  intentionSent: { es: "Intención publicada", en: "Intention published" },
  intentionFlagged: { es: "Tu intención será revisada antes de publicarse.", en: "Your intention will be reviewed before publishing." },
  peoplePraying: { es: "personas rezan", en: "people praying" },
  // misa
  massTitle: { es: "Misa en vivo", en: "Live Mass" },
  nextMass: { es: "Próxima misa", en: "Next Mass" },
  liveNow: { es: "EN VIVO AHORA", en: "LIVE NOW" },
  watchLive: { es: "Ver en vivo", en: "Watch live" },
  noMassScheduled: { es: "Aún no hay próxima misa programada", en: "No upcoming Mass scheduled yet" },
  massRecording: { es: "Grabación de la última misa", en: "Recording of the last Mass" },
  watchRecording: { es: "Ver grabación", en: "Watch recording" },
  communityChat: { es: "Chat de la comunidad", en: "Community chat" },
  chatPlaceholder: { es: "Escribe un mensaje o una jaculatoria…", en: "Write a message or a short prayer…" },
  candlesThisWeek: { es: "velas elevadas esta semana", en: "candles raised this week" },
  days: { es: "días", en: "days" },
  hours: { es: "h", en: "h" },
  minutes: { es: "min", en: "min" },
  seconds: { es: "seg", en: "sec" },
  chatLoginNote: { es: "Únete a la conversación", en: "Join the conversation" },
  // causas
  causesTitle: { es: "Causa del mes", en: "Cause of the month" },
  causesSub: { es: "La comunidad decide a dónde va el 20%", en: "The community decides where the 20% goes" },
  vote: { es: "Votar", en: "Vote" },
  voted: { es: "Votado", en: "Voted" },
  votingClosed: { es: "Votación cerrada", en: "Voting closed" },
  budget: { es: "Presupuesto", en: "Budget" },
  responsible: { es: "Responsable", en: "In charge" },
  location: { es: "Ubicación", en: "Location" },
  timeline: { es: "Plazo", en: "Timeline" },
  totalVotes: { es: "votos totales", en: "total votes" },
  alreadyVoted: { es: "Ya has votado este mes", en: "You already voted this month" },
  voteRegistered: { es: "Tu voto ha sido registrado", en: "Your vote has been registered" },
  transparency: { es: "Panel de transparencia", en: "Transparency panel" },
  totalImpact: { es: "Total transferido a causas", en: "Total transferred to causes" },
  fundedCauses: { es: "Causas financiadas", en: "Funded causes" },
  transferred: { es: "Transferido", en: "Transferred" },
  viewDetails: { es: "Ver detalles", en: "View details" },
  // profile / settings
  profile: { es: "Perfil", en: "Profile" },
  settings: { es: "Ajustes", en: "Settings" },
  myPatron: { es: "Mi santo patrón", en: "My patron saint" },
  candleHistory: { es: "Historial de velas", en: "Candle history" },
  voteHistory: { es: "Historial de votos", en: "Vote history" },
  notifications: { es: "Notificaciones", en: "Notifications" },
  privacy: { es: "Política de privacidad", en: "Privacy policy" },
  terms: { es: "Términos de uso", en: "Terms of use" },
  support: { es: "Soporte", en: "Support" },
  // sin conexión
  offline: { es: "Sin conexión. Verás lo último que cargaste; se actualizará al volver.", en: "You're offline. You'll see what was last loaded; it will refresh when you're back." },
  // pantalla de error (fuera del proveedor de i18n)
  errorTitle: { es: "Algo ha fallado", en: "Something went wrong" },
  errorMessage: { es: "Vuelve a abrir la app para continuar.", en: "Please reload the app to continue." },
  errorReload: { es: "Volver a abrir", en: "Reload app" },
  errorShowDetails: { es: "Ver detalles", en: "Show details" },
  errorHideDetails: { es: "Ocultar detalles", en: "Hide details" },
  // aviso de vela permanente apagada (opt-in, Apple 4.5.4)
  notifyCandleExpiry: { es: "Mi vela permanente se apaga", en: "My permanent candle goes out" },
  notifyCandleExpiryHint: { es: "Te avisamos para que puedas volver a encenderla", en: "We let you know so you can light it again" },
  // analítica de uso con consentimiento (ADR-011)
  analyticsConsent: { es: "Ayúdanos a mejorar la app", en: "Help us improve the app" },
  analyticsConsentHint: {
    es: "Compartir estadísticas de uso: qué pantallas se abren y qué funciones se usan. Nunca tus intenciones, mensajes, nombre ni email. Puedes cambiarlo en Ajustes.",
    en: "Share usage statistics: which screens are opened and which features are used. Never your intentions, messages, name or email. You can change this in Settings.",
  },
  privacySection: { es: "Privacidad", en: "Privacy" },
  // borrado de cuenta (SDD-02, transversal)
  account: { es: "Cuenta", en: "Account" },
  deleteAccount: { es: "Borrar mi cuenta", en: "Delete my account" },
  deleteAccountLead: { es: "Esta acción no se puede deshacer.", en: "This cannot be undone." },
  deleteAccountGone: { es: "Se borra para siempre", en: "Deleted forever" },
  deleteAccountGoneList: {
    es: "Tu perfil y tu email, tus intenciones privadas y públicas, tus mensajes del chat de misa, tu historial de oración y los avisos de este dispositivo.",
    en: "Your profile and email, your private and public intentions, your Mass chat messages, your prayer history and this device's notifications.",
  },
  deleteAccountKept: { es: "Se conserva sin tu nombre", en: "Kept without your name" },
  deleteAccountKeptList: {
    es: "Las velas que encendiste, sin el texto de tu intención, y tus votos, solo como números. Nadie podrá saber que eran tuyos.",
    en: "The candles you lit, without your intention text, and your votes, only as numbers. No one will be able to tell they were yours.",
  },
  deleteAccountConfirmWord: { es: "BORRAR", en: "DELETE" },
  deleteAccountTypeToConfirm: { es: "Para confirmar, escribe {word}", en: "To confirm, type {word}" },
  deleteAccountButton: { es: "Borrar mi cuenta para siempre", en: "Delete my account forever" },
  deleteAccountDone: { es: "Tu cuenta se ha borrado. Que Dios te bendiga.", en: "Your account has been deleted. God bless you." },
  deleteAccountLastAdmin: {
    es: "Eres el último superadmin: nombra a otro antes de borrar tu cuenta.",
    en: "You are the last superadmin: appoint another one before deleting your account.",
  },
  // admin
};

type Key = keyof typeof dict;

type I18nCtx = { lang: Lang; setLang: (l: Lang) => void; t: (k: Key) => string; loc: (obj: any) => string };
const Ctx = createContext<I18nCtx | null>(null);

// Último idioma activo, para lo que se pinta fuera del proveedor (la pantalla de error).
let activeLang: Lang = "es";
export function translate(k: Key, lang: Lang = activeLang): string {
  return dict[k]?.[lang] ?? dict[k]?.es ?? String(k);
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("es");
  useEffect(() => {
    activeLang = lang;
  }, [lang]);

  useEffect(() => {
    storage.getItem<Lang>(LANG_KEY, "es").then((v) => v && setLangState(v));
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    storage.setItem(LANG_KEY, l);
  }, []);

  const t = useCallback((k: Key) => dict[k]?.[lang] ?? dict[k]?.es ?? String(k), [lang]);
  const loc = useCallback(
    (obj: any) => {
      if (!obj) return "";
      if (typeof obj === "string") return obj;
      return obj[lang] || obj.es || obj.en || "";
    },
    [lang],
  );

  return <Ctx.Provider value={{ lang, setLang, t, loc }}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
