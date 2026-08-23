export type PlanKey = "free" | "starter" | "pro" | "enterprise";

/** 0 = بلا حد أقصى (Enterprise). */
export const PLAN_QUOTAS: Record<PlanKey, number> = {
  free: 20,
  starter: 200,
  pro: 1000,
  enterprise: 0,
};

export const PLAN_DISPLAY: Record<PlanKey, { name: string; priceUsd: number }> = {
  free: { name: "Free", priceUsd: 0 },
  starter: { name: "Starter", priceUsd: 49 },
  pro: { name: "Pro", priceUsd: 149 },
  enterprise: { name: "Enterprise", priceUsd: 299 },
};

const PLAN_PRICE_ENV_KEYS: Record<Exclude<PlanKey, "free">, string> = {
  starter: "NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID",
  pro: "NEXT_PUBLIC_STRIPE_PRO_PRICE_ID",
  enterprise: "NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID",
};

export function priceIdForPlan(plan: Exclude<PlanKey, "free">): string | null {
  return process.env[PLAN_PRICE_ENV_KEYS[plan]] || null;
}

export function planFromPriceId(priceId: string | null | undefined): PlanKey {
  if (!priceId) return "free";
  if (priceId === process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID) return "starter";
  if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID) return "pro";
  if (priceId === process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID) return "enterprise";
  return "free";
}

export function isPlanKey(value: string): value is Exclude<PlanKey, "free"> {
  return value === "starter" || value === "pro" || value === "enterprise";
}
