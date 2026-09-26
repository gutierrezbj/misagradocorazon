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
  pushCommunityHint: { es: "Causa del mes y avisos del equipo", en: "Cause of the month and team notices" },
  information: { es: "Información", en: "Information" },
  meditation: { es: "Meditación", en: "Meditation" },
  history: { es: "Historia", en: "History" },
  patronages: { es: "Advocaciones", en: "Patronages" },
  prayerLabel: { es: "Oración", en: "Prayer" },
  amenComplete: { es: "Amén · Completar", en: "Amen · Complete" },
  candlesLabel: { es: "velas", en: "candles" },
  votesLabel: { es: "votos", en: "votes" },
  perWeek: { es: "/sem", en: "/wk" },
  audioPlay: { es: "Reproducir", en: "Play" },
  audioPause: { es: "Pausar", en: "Pause" },
  audioBack15: { es: "Retroceder 15 segundos", en: "Back 15 seconds" },
  audioForward15: { es: "Avanzar 15 segundos", en: "Forward 15 seconds" },
  audioProgress: { es: "Progreso del audio", en: "Audio progress" },
  audioError: { es: "No se pudo cargar el audio.", en: "The audio could not be loaded." },
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
  candleBasicDesc: { es: "Una llama por tu intención", en: "A flame for your intention" },
  candleSolemnDesc: { es: "Llama solemne, duración extendida", en: "Solemn flame, extended duration" },
  candlePermanentDesc: { es: "Siempre encendida, cada semana", en: "Always lit, every week" },
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
  // admin
};

type Key = keyof typeof dict;

type I18nCtx = { lang: Lang; setLang: (l: Lang) => void; t: (k: Key) => string; loc: (obj: any) => string };
const Ctx = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("es");

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
