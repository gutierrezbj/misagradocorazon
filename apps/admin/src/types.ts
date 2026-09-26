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
  mass: { massId: string; scheduledAt: string; chatParticipants: number } | null;
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
