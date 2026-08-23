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

const PLAN_PRICE_ENV_KEYS: Record<Exclude<PlanKey, "free">, { public: string; server: string }> = {
  starter: { public: "NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID", server: "STRIPE_STARTER_PRICE_ID" },
  pro: { public: "NEXT_PUBLIC_STRIPE_PRO_PRICE_ID", server: "STRIPE_PRO_PRICE_ID" },
  enterprise: { public: "NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID", server: "STRIPE_ENTERPRISE_PRICE_ID" },
};

/**
 * معرّفات الأسعار الفعلية من حساب Stripe التجريبي لهذا المشروع (وُلِّدت عبر
 * scripts/setup-stripe.mjs). ليست أسراراً — معرّفات الأسعار عامة وآمنة
 * للتضمين في الكود، على عكس مفاتيح API السرية. تُستخدَم فقط عند غياب
 * متغيرات البيئة المقابلة (مثل بيئة نشر لم تُحدَّث إعداداتها بعد)، حتى لا
 * ينكسر تدفق الاشتراك بالكامل بسبب إعداد بيئة ناقص.
 */
const HARDCODED_PRICE_FALLBACKS: Record<Exclude<PlanKey, "free">, string> = {
  starter: "price_1U7bwX0wSQUgDFQQUzFUKrJN",
  pro: "price_1U7bwr0wSQUgDFQQyfVroOls",
  enterprise: "price_1U7c9o0wSQUgDFQQgNhl9vga",
};

/** يُرجع دائماً معرّف سعر صالحاً (env public → env server → fallback ثابت) — لا يُرجع null أبداً. */
export function priceIdForPlan(plan: Exclude<PlanKey, "free">): string {
  const keys = PLAN_PRICE_ENV_KEYS[plan];
  return process.env[keys.public] || process.env[keys.server] || HARDCODED_PRICE_FALLBACKS[plan];
}

const ALL_PAID_PLANS: Exclude<PlanKey, "free">[] = ["starter", "pro", "enterprise"];

/** يقارن مقابل نفس المصدر المُستخدَم في priceIdForPlan (بما فيه fallback الثابت) لضمان تطابق الويب هوك دائماً مع الجلسات المُنشأة عبر أي مصدر سعر. */
export function planFromPriceId(priceId: string | null | undefined): PlanKey {
  if (!priceId) return "free";
  for (const plan of ALL_PAID_PLANS) {
    if (priceId === priceIdForPlan(plan)) return plan;
  }
  return "free";
}

export function isPlanKey(value: string): value is Exclude<PlanKey, "free"> {
  return value === "starter" || value === "pro" || value === "enterprise";
}
