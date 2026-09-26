import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type Lang = "es" | "en";

// Todos los textos del panel pasan por aquí (CLAUDE.md: nada escrito a mano en la interfaz).
const dict = {
  appName: { es: "Mi Sagrado Corazón", en: "Mi Sagrado Corazón" },
  panel: { es: "Panel de gestión", en: "Management panel" },
  // auth
  signIn: { es: "Entrar", en: "Sign in" },
  signInTitle: { es: "Acceso del equipo", en: "Team access" },
  email: { es: "Correo electrónico", en: "Email" },
  password: { es: "Contraseña", en: "Password" },
  badCredentials: { es: "Correo o contraseña incorrectos", en: "Wrong email or password" },
  logout: { es: "Cerrar sesión", en: "Sign out" },
  forbiddenTitle: { es: "Sin acceso al panel", en: "No panel access" },
  forbiddenBody: { es: "Tu cuenta no tiene un rol de gestión. Pide acceso a un superadmin.", en: "Your account has no management role. Ask a superadmin for access." },
  language: { es: "Idioma", en: "Language" },
  // nav
  navDashboard: { es: "Resumen", en: "Overview" },
  navModeration: { es: "Moderación", en: "Moderation" },
  navCauses: { es: "Causas", en: "Causes" },
  navMasses: { es: "Misas", en: "Masses" },
  navUsers: { es: "Usuarios", en: "Users" },
  navNotifications: { es: "Notificaciones", en: "Notifications" },
  navSaints: { es: "Santoral", en: "Saints" },
  navDaily: { es: "Contenido diario", en: "Daily content" },
  // roles
  role_user: { es: "Fiel", en: "Member" },
  role_moderator: { es: "Moderador", en: "Moderator" },
  role_editor: { es: "Editor", en: "Editor" },
  role_superadmin: { es: "Superadmin", en: "Superadmin" },
  // dashboard
  dashTitle: { es: "Resumen", en: "Overview" },
  dashSub: { es: "Cómo va la comunidad", en: "How the community is doing" },
  lastDays: { es: "Últimos {n} días", en: "Last {n} days" },
  kpiUsers: { es: "Fieles registrados", en: "Registered members" },
  kpiNew: { es: "{n} nuevos en el periodo", en: "{n} new in period" },
  kpiMau: { es: "Activos (30 días)", en: "Active (30 days)" },
  kpiDauWau: { es: "{d} hoy · {w} esta semana", en: "{d} today · {w} this week" },
  kpiD7: { es: "Retención D7", en: "D7 retention" },
  kpiD30: { es: "Retención D30", en: "D30 retention" },
  kpiCohort: { es: "Cohorte de {n}", en: "Cohort of {n}" },
  kpiCandles: { es: "Velas encendidas", en: "Candles lit" },
  kpiConversion: { es: "Conversión a vela", en: "Candle conversion" },
  kpiConversionHint: { es: "{n} fieles con vela / activos", en: "{n} members with a candle / active" },
  kpiRevenue: { es: "Ingresos", en: "Revenue" },
  kpiImpact: { es: "20 % para la causa", en: "20% for the cause" },
  kpiSimulated: { es: "Simulado: sin cobro real", en: "Simulated: no real charges" },
  kpiVoting: { es: "Participación en votación", en: "Voting participation" },
  kpiVotes: { es: "{n} votos en {m}", en: "{n} votes in {m}" },
  kpiMass: { es: "Participación en la última misa", en: "Last mass participation" },
  kpiMassHint: { es: "Personas que escribieron en el chat (mínimo)", en: "People who wrote in the chat (lower bound)" },
  kpiPending: { es: "Pendiente de moderar", en: "Pending moderation" },
  chartCandlesByDay: { es: "Velas por día", en: "Candles per day" },
  chartByType: { es: "Por tipo de vela", en: "By candle type" },
  chartBySaint: { es: "Santos con más velas", en: "Saints with most candles" },
  showTable: { es: "Ver tabla", en: "Show table" },
  showChart: { es: "Ver gráfico", en: "Show chart" },
  colDay: { es: "Día", en: "Day" },
  colCandles: { es: "Velas", en: "Candles" },
  noData: { es: "Sin datos todavía", en: "No data yet" },
  type_basic: { es: "Básica", en: "Basic" },
  type_solemn: { es: "Solemne", en: "Solemn" },
  type_permanent: { es: "Permanente", en: "Permanent" },
  // moderation
  modTitle: { es: "Moderación", en: "Moderation" },
  modSub: { es: "Intenciones y mensajes retenidos por el filtro", en: "Intentions and messages held by the filter" },
  modIntentions: { es: "Intenciones en cola", en: "Queued intentions" },
  modChat: { es: "Mensajes de chat en cola", en: "Queued chat messages" },
  modEmpty: { es: "Nada pendiente. Gracias por cuidar la comunidad.", en: "Nothing pending. Thank you for caring for the community." },
  approve: { es: "Aprobar", en: "Approve" },
  hide: { es: "Ocultar", en: "Hide" },
  reason: { es: "Motivo (opcional)", en: "Reason (optional)" },
  words: { es: "Palabras filtradas", en: "Filtered words" },
  wordsHint: { es: "Sin tildes ni mayúsculas: se comparan normalizadas.", en: "Accents and case are ignored." },
  addWord: { es: "Añadir", en: "Add" },
  remove: { es: "Quitar", en: "Remove" },
  newWord: { es: "Nueva palabra o frase", en: "New word or phrase" },
  // causes
  causesTitle: { es: "Causas", en: "Causes" },
  causesSub: { es: "Candidatas, votación y seguimiento de la ganadora", en: "Candidates, voting and winner follow-up" },
  newCause: { es: "Nueva causa", en: "New cause" },
  month: { es: "Mes de votación", en: "Voting month" },
  nameEs: { es: "Nombre (ES)", en: "Name (ES)" },
  nameEn: { es: "Nombre (EN)", en: "Name (EN)" },
  location: { es: "Ubicación", en: "Location" },
  responsible: { es: "Responsable", en: "Responsible" },
  descEs: { es: "Descripción (ES)", en: "Description (ES)" },
  descEn: { es: "Descripción (EN)", en: "Description (EN)" },
  budget: { es: "Presupuesto (USD)", en: "Budget (USD)" },
  timeline: { es: "Plazo", en: "Timeline" },
  photos: { es: "Fotos (una URL por línea)", en: "Photos (one URL per line)" },
  save: { es: "Guardar", en: "Save" },
  cancel: { es: "Cancelar", en: "Cancel" },
  status: { es: "Estado", en: "Status" },
  status_candidate: { es: "Candidata", en: "Candidate" },
  status_voting: { es: "En votación", en: "Voting" },
  status_won: { es: "Ganadora", en: "Winner" },
  status_funded: { es: "Financiada", en: "Funded" },
  status_archived: { es: "Archivada", en: "Archived" },
  addProgress: { es: "Publicar avance", en: "Post progress" },
  progressEs: { es: "Avance (ES)", en: "Progress (ES)" },
  progressEn: { es: "Avance (EN)", en: "Progress (EN)" },
  photoUrl: { es: "URL de foto (opcional)", en: "Photo URL (optional)" },
  registerTransfer: { es: "Registrar transferencia", en: "Record transfer" },
  amountUsd: { es: "Importe (USD)", en: "Amount (USD)" },
  note: { es: "Nota", en: "Note" },
  transferHint: { es: "Queda en el libro de movimientos y no se puede editar ni borrar.", en: "Goes into the ledger and cannot be edited or deleted." },
  noCauses: { es: "Todavía no hay causas.", en: "No causes yet." },
  // masses
  massesTitle: { es: "Misas", en: "Masses" },
  massesSub: { es: "Programación de la misa en vivo", en: "Live mass schedule" },
  newMass: { es: "Programar misa", en: "Schedule mass" },
  titleEs: { es: "Título (ES)", en: "Title (ES)" },
  titleEn: { es: "Título (EN)", en: "Title (EN)" },
  youtubeUrl: { es: "URL de YouTube Live", en: "YouTube Live URL" },
  scheduledAt: { es: "Fecha y hora (tu zona horaria)", en: "Date and time (your time zone)" },
  duration: { es: "Duración (min)", en: "Duration (min)" },
  special: { es: "Celebración especial", en: "Special celebration" },
  recordingUrl: { es: "URL de la grabación", en: "Recording URL" },
  status_scheduled: { es: "Programada", en: "Scheduled" },
  status_live: { es: "En vivo", en: "Live" },
  status_ended: { es: "Celebrada", en: "Ended" },
  noMasses: { es: "No hay misas programadas.", en: "No masses scheduled." },
  // users
  usersTitle: { es: "Usuarios y roles", en: "Users and roles" },
  usersSub: { es: "Solo superadmin. Cada cambio queda registrado.", en: "Superadmin only. Every change is logged." },
  search: { es: "Buscar por nombre o correo", en: "Search by name or email" },
  name: { es: "Nombre", en: "Name" },
  role: { es: "Rol", en: "Role" },
  joined: { es: "Alta", en: "Joined" },
  block: { es: "Bloquear", en: "Block" },
  unblock: { es: "Desbloquear", en: "Unblock" },
  blocked: { es: "Bloqueado", en: "Blocked" },
  you: { es: "tú", en: "you" },
  // genérico
  loading: { es: "Cargando…", en: "Loading…" },
  // santoral
  saintsTitle: { es: "Santoral", en: "Saints" },
  saintsSub: {
    es: "Fichas de los santos con imagen y audio en cada idioma. El audio lo graba el equipo.",
    en: "Saint profiles with image and audio in each language. The team records the audio.",
  },
  newSaint: { es: "Nuevo santo", en: "New saint" },
  saintName: { es: "Nombre", en: "Name" },
  feastDate: { es: "Fiesta (MM-DD)", en: "Feast (MM-DD)" },
  sortOrder: { es: "Orden", en: "Order" },
  patronCatalog: { es: "Elegible como patrón", en: "Available as patron" },
  santoralOnly: { es: "Solo santoral", en: "Calendar only" },
  image: { es: "Imagen", en: "Image" },
  audio: { es: "Audio", en: "Audio" },
  audioEs: { es: "Audio (ES)", en: "Audio (ES)" },
  audioEn: { es: "Audio (EN)", en: "Audio (EN)" },
  audioEsOptional: { es: "Audio (ES, opcional)", en: "Audio (ES, optional)" },
  audioEnOptional: { es: "Audio (EN, opcional)", en: "Audio (EN, optional)" },
  historyEs: { es: "Historia (ES)", en: "History (ES)" },
  historyEn: { es: "Historia (EN)", en: "History (EN)" },
  patronagesEs: { es: "Advocaciones (ES)", en: "Patronages (ES)" },
  patronagesEn: { es: "Advocaciones (EN)", en: "Patronages (EN)" },
  saintPrayerEs: { es: "Oración (ES)", en: "Prayer (ES)" },
  saintPrayerEn: { es: "Oración (EN)", en: "Prayer (EN)" },
  edit: { es: "Editar", en: "Edit" },
  restore: { es: "Recuperar", en: "Restore" },
  hidden: { es: "Oculto en la app", en: "Hidden in the app" },
  saintInUse: {
    es: "No se puede ocultar a {name}: es el patrón de algún fiel o el santo de un día próximo.",
    en: "{name} cannot be hidden: it is someone's patron or the saint of an upcoming day.",
  },
  // subidas
  uploadFile: { es: "Subir fichero", en: "Upload file" },
  uploading: { es: "Subiendo…", en: "Uploading…" },
  imageHint: { es: "JPG, PNG o WebP, hasta 5 MB.", en: "JPG, PNG or WebP, up to 5 MB." },
  audioHint: { es: "MP3 o M4A, hasta 50 MB. Grabado por el equipo.", en: "MP3 or M4A, up to 50 MB. Recorded by the team." },
  storageMissing: {
    es: "El almacenamiento (R2) aún no está configurado: pega la URL del fichero.",
    en: "Storage (R2) is not configured yet: paste the file URL.",
  },
  uploadError: { es: "No se pudo subir el fichero.", en: "The file could not be uploaded." },
  // contenido diario
  dailyTitle: { es: "Contenido diario", en: "Daily content" },
  dailySub: {
    es: "Evangelio, meditación y oraciones de cada día, con su audio. Sin contenido, la app no muestra ese día.",
    en: "Gospel, meditation and prayers for each day, with audio. Without content, the app shows nothing for that day.",
  },
  daysMissing: { es: "Faltan {n} días por preparar en las próximas tres semanas.", en: "{n} days still to prepare in the next three weeks." },
  pickDay: { es: "Elige un día de la lista para prepararlo.", en: "Pick a day from the list to prepare it." },
  next21: { es: "Próximos 21 días", en: "Next 21 days" },
  missing: { es: "Falta", en: "Missing" },
  dayOf: { es: "Día {date}", en: "Day {date}" },
  saintOfDay: { es: "Santo del día", en: "Saint of the day" },
  noSaint: { es: "Sin santo", en: "No saint" },
  gospelRef: { es: "Cita del evangelio", en: "Gospel reference" },
  gospel: { es: "Evangelio", en: "Gospel" },
  meditationLabel: { es: "Meditación", en: "Meditation" },
  morningPrayerLabel: { es: "Oración de la mañana", en: "Morning prayer" },
  nightPrayerLabel: { es: "Oración de la noche", en: "Night prayer" },
  textEs: { es: "Texto (ES)", en: "Text (ES)" },
  textEn: { es: "Texto (EN)", en: "Text (EN)" },
  morningShort: { es: "Mañana", en: "Morning" },
  nightShort: { es: "Noche", en: "Night" },
  // notificaciones
  notificationsTitle: { es: "Notificaciones", en: "Notifications" },
  notificationsSub: {
    es: "Avisos del equipo a la comunidad. Los recordatorios de oración y el santo del día salen solos.",
    en: "Team announcements to the community. Prayer reminders and the saint of the day go out automatically.",
  },
  sentCampaigns: { es: "Avisos enviados", en: "Sent announcements" },
  noCampaigns: { es: "Aún no se ha enviado ningún aviso.", en: "No announcements sent yet." },
  newCampaign: { es: "Nuevo aviso", en: "New announcement" },
  campaignHint: {
    es: "Llega a quien tiene la app instalada y acepta avisos de la comunidad. Sin datos personales ni intenciones.",
    en: "Reaches people with the app installed who accept community notices. No personal data or intentions.",
  },
  messageEs: { es: "Mensaje (ES)", en: "Message (ES)" },
  messageEn: { es: "Mensaje (EN)", en: "Message (EN)" },
  campaignReview: { es: "Revisar y enviar", en: "Review and send" },
  campaignConfirm: {
    es: "Se enviará ahora a {n} personas y no se puede deshacer.",
    en: "It will be sent now to {n} people and cannot be undone.",
  },
  campaignSendNow: { es: "Enviar a {n} personas", en: "Send to {n} people" },
  campaignSent: { es: "Enviado a {n}", en: "Sent to {n}" },
  campaignQueued: { es: "En cola", en: "Queued" },
  campaignNoAudience: {
    es: "Todavía nadie puede recibir avisos: hace falta la app instalada con notificaciones activadas.",
    en: "Nobody can receive notices yet: people need the app installed with notifications on.",
  },
  genericError: { es: "Algo ha fallado. Inténtalo de nuevo.", en: "Something went wrong. Please try again." },
  saved: { es: "Guardado", en: "Saved" },
} as const;

export type I18nKey = keyof typeof dict;

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: I18nKey, vars?: Record<string, string | number>) => string };
const I18nContext = createContext<Ctx | null>(null);
const LANG_KEY = "msc.admin.lang";

function initialLang(): Lang {
  try {
    const v = localStorage.getItem(LANG_KEY);
    if (v === "es" || v === "en") return v;
  } catch {
    /* almacenamiento no disponible */
  }
  return "es";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(LANG_KEY, l);
    } catch {
      /* sin persistencia */
    }
    document.documentElement.lang = l;
  }, []);
  const t = useCallback(
    (k: I18nKey, vars?: Record<string, string | number>) =>
      dict[k][lang].replace(/\{(\w+)\}/g, (_, name: string) => String(vars?.[name] ?? `{${name}}`)),
    [lang],
  );
  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n fuera de I18nProvider");
  return ctx;
}
