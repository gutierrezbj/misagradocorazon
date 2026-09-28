import type { LiturgicalSeason, Role } from "@msc/shared";

export type Me = { id: string; name: string; email: string; role: Role };

export type Kpis = {
  generatedAt: string;
  windowDays: number;
  users: { total: number; new: number; onboarded: number };
  active: { dau: number; wau: number; mau: number };
  retention: { d7: { cohort: number; rate: number | null }; d30: { cohort: number; rate: number | null } };
  candles: {
    total: number;
    buyers: number;
    conversionRate: number | null;
    byDay: { day: string; candles: number }[];
    byType: { type: "basic" | "solemn" | "permanent"; candles: number }[];
    bySaint: { saintId: string; name: string; candles: number }[];
  };
  money: { simulated: boolean; revenueCents: number; impactCents: number; transferredCents: number };
  voting: { month: string; votes: number; participationRate: number | null };
  mass: { massId: string; scheduledAt: string; attendees: number; chatParticipants: number } | null;
  daily: { day: string; newUsers: number; activeUsers: number; candles: number; revenueCents: number }[];
  moderation: { pending: number };
  prayers: { current: LiturgicalSeason; bySeason: { season: LiturgicalSeason; days: number; prayers: number; perDay: number }[] };
  goals: Goal[];
};

// Métricas de éxito del MVP (especificación §10), siempre sobre los últimos 30 días.
export type Goal = {
  key: string;
  value: number | null;
  unit: "count" | "pct" | "usdCents";
  target: { m3: number; m6: number };
};

export type Localized = { es: string; en: string };

export type Cause = {
  id: string;
  month: string;
  name: Localized;
  location: string;
  responsible: string;
  description: Localized;
  // Destino del dinero; null en causas creadas antes de existir el campo.
  fundsUse: Localized | null;
  budgetCents: number;
  budgetItems: { concept: Localized; amountCents: number }[];
  photos: string[];
  timeline: string;
  status: "candidate" | "voting" | "won" | "funded" | "archived";
};

export type Mass = {
  id: string;
  title: Localized;
  youtubeUrl: string;
  scheduledAt: string;
  durationMin: number;
  isSpecial: boolean;
  recordingUrl: string | null;
  status: "scheduled" | "live" | "ended";
};

export type Queue = {
  intentions: { id: string; author: string; text: string; category: string; createdAt: string }[];
  chat: { id: string; massId: string; author: string; text: string; createdAt: string }[];
};

export type AdminUser = { id: string; name: string; email: string; role: Role; blocked: boolean; onboarded: boolean; createdAt: string };

export type PushCampaigns = {
  audience: number;
  campaigns: {
    id: string;
    title: Localized;
    body: Localized;
    createdBy: string;
    createdAt: string;
    sentAt: string | null;
    recipients: number | null;
  }[];
};

export type AdminSaint = {
  id: string;
  name: string;
  feastDate: string;
  imageUrl: string;
  audioUrlEs: string | null;
  audioUrlEn: string | null;
  historyEs: string;
  historyEn: string;
  patronagesEs: string;
  patronagesEn: string;
  prayerEs: string;
  prayerEn: string;
  isPatronCatalog: boolean;
  sortOrder: number;
  deletedAt: string | null;
};

type LangFlags = { es: boolean; en: boolean };
export type DailyDay = {
  date: string;
  season: LiturgicalSeason;
  filled: boolean;
  saintOfDay: string | null;
  gospelRef: string | null;
  // De dónde sale la oración que verá el fiel: la propia del día o la del tiempo (null = ninguna).
  prayers: { morning: PrayerSource | null; night: PrayerSource | null } | null;
  audio: { morning: LangFlags; night: LangFlags; meditation: LangFlags } | null;
};
type PrayerSource = "day" | "season";

export type SeasonalPrayer = { textEs: string; textEn: string; audioUrlEs: string | null; audioUrlEn: string | null };
export type SeasonRow = { season: LiturgicalSeason; current: boolean; morning: SeasonalPrayer | null; night: SeasonalPrayer | null };

export type DailyRow = {
  date: string;
  saintOfDayId: string | null;
  gospelRef: string;
  gospelEs: string;
  gospelEn: string;
  meditationEs: string;
  meditationEn: string;
  morningPrayerEs: string | null;
  morningPrayerEn: string | null;
  nightPrayerEs: string | null;
  nightPrayerEn: string | null;
  meditationAudioUrlEs: string | null;
  meditationAudioUrlEn: string | null;
  morningAudioUrlEs: string | null;
  morningAudioUrlEn: string | null;
  nightAudioUrlEs: string | null;
  nightAudioUrlEn: string | null;
};

export type Transparency = {
  totals: { revenueCents: number; impactCents: number; transferredCents: number };
  pendingCents: number;
  months: {
    month: string;
    revenueCents: number;
    impactCents: number;
    transferredCents: number;
    pendingCents: number;
    cause: { id: string; name: Localized; status: string } | null;
  }[];
};

export type LedgerType = "purchase" | "impact_allocation" | "transfer";
export type LedgerPage = {
  entries: { id: string; type: LedgerType; amountCents: number; createdAt: string; candleType: string | null; cause: Localized | null; note: string | null }[];
  nextCursor: string | null;
};

export type AuditPage = {
  entries: {
    id: string;
    action: string;
    entity: string;
    entityId: string;
    data: Record<string, unknown> | null;
    createdAt: string;
    actor: { id: string; name: string | null; role: string | null; deleted: boolean };
  }[];
  nextCursor: string | null;
};
