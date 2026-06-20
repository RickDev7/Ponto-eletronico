export type PlanKey = "starter" | "professional" | "enterprise";

export interface PlanDefinition {
  key: PlanKey;
  name: string;
  priceMonthlyCents: number;
  stripePriceId: string | null;
  trialDays: number;
  limits: {
    employees: number;
    tasksPerMonth: number;
    storageGb: number;
  };
}

export const PLANS: Record<PlanKey, PlanDefinition> = {
  starter: {
    key: "starter",
    name: "Starter",
    priceMonthlyCents: 0,
    stripePriceId: process.env.STRIPE_PRICE_STARTER ?? null,
    trialDays: 14,
    limits: { employees: 3, tasksPerMonth: 50, storageGb: 5 },
  },
  professional: {
    key: "professional",
    name: "Professional",
    priceMonthlyCents: 9900,
    stripePriceId: process.env.STRIPE_PRICE_PROFESSIONAL ?? null,
    trialDays: 14,
    limits: { employees: 25, tasksPerMonth: -1, storageGb: 50 },
  },
  enterprise: {
    key: "enterprise",
    name: "Enterprise",
    priceMonthlyCents: 0,
    stripePriceId: process.env.STRIPE_PRICE_ENTERPRISE ?? null,
    trialDays: 14,
    limits: { employees: -1, tasksPerMonth: -1, storageGb: 500 },
  },
};

export function resolvePlanKey(value: string | undefined): PlanKey {
  if (value === "starter" || value === "professional" || value === "enterprise") {
    return value;
  }
  return "starter";
}

export function formatPlanPrice(cents: number, locale = "de-DE"): string {
  if (cents === 0) return "€0";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}
