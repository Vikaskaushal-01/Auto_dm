import type { MessagingTier } from "./types";

/** Unique customers a WhatsApp Business account may message per 24h, per tier. */
export const TIER_LIMITS: Record<MessagingTier, number> = {
  TIER_1: 250,
  TIER_2: 1_000,
  TIER_3: 10_000,
  TIER_4: 100_000,
  UNLIMITED: Number.POSITIVE_INFINITY,
};

export const TIER_LABELS: Record<MessagingTier, string> = {
  TIER_1: "Tier 1 — 250/day",
  TIER_2: "Tier 2 — 1,000/day",
  TIER_3: "Tier 3 — 10,000/day",
  TIER_4: "Tier 4 — 100,000/day",
  UNLIMITED: "Unlimited",
};
