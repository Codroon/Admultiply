/* Single source of truth for plans + token economics.
   Consumed by the landing pricing section and the dashboard billing screen. */

export type PlanId = "free" | "plus" | "starter" | "creator" | "pro" | "business";

export type Plan = {
  id: PlanId;
  name: string;
  price: number;
  blurb: string;
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
    blurb: "Trial of AdMultiply AI",
    tokens: 4,
    features: ["4 video tokens / month", "Low-res videos", "Includes AdMultiply watermark"],
    cta: "Start Free",
    hd: false,
  },
  {
    id: "plus",
    name: "Plus",
    price: 9,
    blurb: "Trial of AdMultiply AI",
    tokens: 5,
    features: ["5 video tokens / month", "Hi-res videos", "No watermark", "$1.80 per video repurposed"],
    cta: "Get Plus",
    hd: true,
  },
  {
    id: "starter",
    name: "Starter",
    price: 19,
    blurb: "First videos free",
    tokens: 10,
    features: ["10 video tokens / month", "Hi-res videos", "$1.90 per video repurposed"],
    cta: "Get Starter",
    hd: true,
  },
  {
    id: "creator",
    name: "Creator",
    price: 39,
    blurb: "First video free",
    tokens: 25,
    features: ["25 video tokens / month", "Hi-res videos", "$1.56 per video repurposed"],
    cta: "Get Creator",
    badge: "Most Popular",
    highlighted: true,
    hd: true,
  },
  {
    id: "pro",
    name: "Pro",
    price: 69,
    blurb: "First video free",
    tokens: 50,
    features: ["50 video tokens / month", "Hi-res videos", "$1.38 per video repurposed"],
    cta: "Get Pro",
    hd: true,
  },
  {
    id: "business",
    name: "Business",
    price: 99,
    blurb: "First video free",
    tokens: 80,
    features: ["80 video tokens / month", "Hi-res videos", "$1.23 per video repurposed"],
    cta: "Get Business",
    hd: true,
  },
];

export const getPlan = (id: PlanId): Plan =>
  PLANS.find((p) => p.id === id) ?? PLANS[0];

/* 1 token = 1 upload = 3 variations. Downloads are gated by tier, never by tokens. */
export const TOKEN_RULE = "1 token = 1 video upload → 3 variations";
