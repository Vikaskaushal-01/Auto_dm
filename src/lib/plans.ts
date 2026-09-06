export const PURCHASABLE_PLANS = ["FREE", "CREATOR", "PRO", "BUSINESS", "AGENCY"] as const;
export type PurchasablePlan = (typeof PURCHASABLE_PLANS)[number];

export interface PlanDef {
  plan: PurchasablePlan;
  label: string;
  priceRupees: number;
  tagline: string;
  features: string[];
}

export const PLAN_DEFS: PlanDef[] = [
  {
    plan: "FREE",
    label: "Free",
    priceRupees: 0,
    tagline: "Try the basics",
    features: ["1 connected account", "100 automated DMs / month", "Basic analytics"],
  },
  {
    plan: "CREATOR",
    label: "Creator",
    priceRupees: 999,
    tagline: "For solo creators getting started",
    features: ["3 connected accounts", "2,000 automated DMs / month", "Unified inbox + CRM", "Link-in-bio page"],
  },
  {
    plan: "PRO",
    label: "Pro",
    priceRupees: 2499,
    tagline: "For creators scaling their DM funnel",
    features: ["10 connected accounts", "20,000 automated DMs / month", "Visual flow builder", "Digital products & checkout"],
  },
  {
    plan: "BUSINESS",
    label: "Business",
    priceRupees: 5999,
    tagline: "For teams running multiple brands",
    features: ["Unlimited connected accounts", "100,000 automated DMs / month", "Team seats & roles", "Priority support"],
  },
  {
    plan: "AGENCY",
    label: "Agency",
    priceRupees: 14999,
    tagline: "White-label for agencies managing clients",
    features: ["Unlimited workspaces", "Unlimited automated DMs", "White-label branding", "Dedicated account manager"],
  },
];

export const PLAN_RANK: Record<PurchasablePlan, number> = {
  FREE: 0,
  CREATOR: 1,
  PRO: 2,
  BUSINESS: 3,
  AGENCY: 4,
};
