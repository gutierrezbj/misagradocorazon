// Tipos de la API (apps/api). Los campos localizados llegan como { es, en } y se muestran con loc().
import type { CandleCategory, CandleType, IntentionCategory, Locale, Role } from "@msc/shared";

export type Localized = { es: string; en: string };

// Audio grabado por el equipo en cada idioma; null si aún no existe (SDD-05 US-07).
export type LocalizedAudio = { es: string | null; en: string | null };

export type User = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: Role;
  onboarded: boolean;
  patronSaintId: string | null;
  secondarySaintIds: string[];
  language: Locale;
  timezone: string;
  morningTime: string;
  angelusTime: string;
  nightTime: string;
  notifyMorning: boolean;
  notifyNight: boolean;
  notifySaint: boolean;
  notifyCommunity: boolean;
  streak: number;
};

export type Saint = {
  id: string;
  name: string;
  feastDate: string;
  imageUrl: string;
  audioUrl: LocalizedAudio;
  history: Localized;
  patronages: Localized;
  prayer: Localized;
  isPatronCatalog: boolean;
};

export type Daily = {
  date: string;
  saintOfDay: Saint | null;
  gospel: { ref: string } & Localized;
  meditation: Localized & { audioUrl: LocalizedAudio };
  morningPrayer: Localized & { audioUrl: LocalizedAudio };
  nightPrayer: Localized & { audioUrl: LocalizedAudio };
};

export type MyCandle = {
  id: string;
  saintId: string;
  saint: { id: string; name: string; imageUrl: string };
  intention: string;
  type: CandleType;
  category: CandleCategory;
  priceCents: number;
  litAt: string;
  expiresAt: string;
  active: boolean;
};

export type CommunityCandles = {
  active: number;
  last24h: number;
  last7d: number;
  flames: { saintId: string; type: CandleType; category: CandleCategory; litAt: string }[];
};

export type Intention = {
  id: string;
  author: string;
  text: string;
  category: IntentionCategory;
  prayCount: number;
  alreadyPrayed: boolean;
  createdAt: string;
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

export type ChatMessage = { id: string; author: string; text: string; createdAt: string };

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
  votes?: number;
  percentage?: number;
};

export type CurrentCauses = {
  month: string;
  votingOpen: boolean;
  totalVotes: number;
  myVoteCauseId: string | null;
  causes: Cause[];
};

export type Transparency = {
  totals: { revenueCents: number; impactCents: number; transferredCents: number };
  months: {
    month: string;
    revenueCents: number;
    impactCents: number;
    transferredCents: number;
    cause: { id: string; name: Localized; status: Cause["status"] } | null;
  }[];
};

export type MyVote = { month: string; cause: { id: string; name: Localized; status: Cause["status"] }; createdAt: string };
