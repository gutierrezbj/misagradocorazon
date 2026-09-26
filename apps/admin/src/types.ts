import type { Role } from "@msc/shared";

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
};

export type Localized = { es: string; en: string };

export type Cause = {
  id: string;
  month: string;
  name: Localized;
  location: string;
  responsible: string;
  description: Localized;
  budgetCents: number;
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
  filled: boolean;
  saintOfDay: string | null;
  gospelRef: string | null;
  audio: { morning: LangFlags; night: LangFlags; meditation: LangFlags } | null;
};

export type DailyRow = {
  date: string;
  saintOfDayId: string | null;
  gospelRef: string;
  gospelEs: string;
  gospelEn: string;
  meditationEs: string;
  meditationEn: string;
  morningPrayerEs: string;
  morningPrayerEn: string;
  nightPrayerEs: string;
  nightPrayerEn: string;
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
