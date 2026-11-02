/* Single source of truth for plans + token economics.
   Consumed by the landing pricing section and the dashboard billing screen. */

export type PlanId = "free" | "plus" | "starter" | "creator" | "pro" | "business";

export type Plan = {
  id: PlanId;
  name: string;
  price: number;
  /** Optional line under the price. The paid tiers have none. */
  blurb?: string;
  tokens: number;
  features: string[];
  cta: string;
  badge?: string;
  highlighted?: boolean;
  hd: boolean; // HD, watermark-free downloads
};

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    blurb: "Trial AdMultiply for free today",
    tokens: 3,
    features: [
      "3 video tokens / month",
      "9 repurposed micro videos / month",
      "Low-res videos",
      "Includes AdMultiply watermark",
    ],
    cta: "Start Free",
    hd: false,
  },
  {
    id: "plus",
    name: "Free Plus+",
    price: 0,
    blurb: "Trial AdMultiply for free today",
    tokens: 5,
    features: [
      "5 video tokens / month",
      "15 repurposed micro videos / month",
      "Hi-res videos",
      "No watermark",
    ],
    cta: "Get Free Plus+",
    hd: true,
  },
  {
    id: "starter",
    name: "Starter",
    price: 16,
    tokens: 10,
    features: [
      "10 video tokens / month",
      "30 repurposed micro videos / month",
      "Hi-res videos",
      "$1.60 per video repurposed",
    ],
    cta: "Get Starter",
    hd: true,
  },
  {
    id: "creator",
    name: "Creator",
    price: 39,
    tokens: 25,
    features: [
      "25 video tokens / month",
      "75 repurposed micro videos / month",
      "Hi-res videos",
      "$1.56 per video repurposed",
    ],
    cta: "Get Creator",
    badge: "Most Popular",
    highlighted: true,
    hd: true,
  },
  {
    id: "pro",
    name: "Pro",
    price: 69,
    tokens: 50,
    features: [
      "50 video tokens / month",
      "150 repurposed micro videos / month",
      "Hi-res videos",
      "$1.38 per video repurposed",
    ],
    cta: "Get Pro",
    hd: true,
  },
  {
    id: "business",
    name: "Business",
    price: 99,
    tokens: 80,
    features: [
      "80 video tokens / month",
      "240 repurposed micro videos / month",
      "Hi-res videos",
      "$1.23 per video repurposed",
    ],
    cta: "Get Business",
    hd: true,
  },
];

export const getPlan = (id: PlanId): Plan =>
  PLANS.find((p) => p.id === id) ?? PLANS[0];

/* PLANS is ordered cheapest → richest, so "the next tier up" is the next entry. */
export const nextPlan = (id: PlanId): Plan | null => {
  const i = PLANS.findIndex((p) => p.id === id);
  return i >= 0 && i < PLANS.length - 1 ? PLANS[i + 1] : null;
};

/* Label for the upsell button, always names the next tier up, so the user
   sees one clear step rather than a vague "upgrade". Returns null on the top
   tier, where there is nothing left to sell. */
export const upgradeCta = (id: PlanId): string | null => {
  const next = nextPlan(id);
  return next ? `Upgrade to ${next.name}` : null;
};

/* 1 token = 1 upload = 3 variations. Downloads are gated by tier, never by tokens. */
export const TOKEN_RULE = "1 token = 1 video upload → 3 variations";
