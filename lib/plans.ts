export type PlanKey = "free" | "starter" | "pro" | "enterprise";

/** 0 = بلا حد أقصى (Enterprise). */
export const PLAN_QUOTAS: Record<PlanKey, number> = {
  free: 20,
  starter: 200,
  pro: 1000,
  enterprise: 0,
};

/**
 * أسعار الخطط بالدرهم المغربي (MAD) — عملة YouCanPay الأساسية. تُقرأ
 * كمراجع process.env.NEXT_PUBLIC_* حرفية (وليس بحث ديناميكي بمفتاح) عمداً،
 * لأن Next.js يُضمِّنها ثابتة في حزمة العميل فقط عند كتابتها هكذا — هذا
 * الملف يُستورَد من مكوّنات "use client" (BillingPricingCards، LandingPage).
 */
function envPrice(value: string | undefined, fallback: number): number {
  const parsed = value ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const PLAN_DISPLAY: Record<PlanKey, { name: string; priceMad: number }> = {
  free: { name: "Free", priceMad: 0 },
  starter: { name: "Starter", priceMad: envPrice(process.env.NEXT_PUBLIC_PLAN_STARTER_PRICE_MAD, 290) },
  pro: { name: "Pro", priceMad: envPrice(process.env.NEXT_PUBLIC_PLAN_PRO_PRICE_MAD, 790) },
  enterprise: { name: "Enterprise", priceMad: envPrice(process.env.NEXT_PUBLIC_PLAN_ENTERPRISE_PRICE_MAD, 1990) },
};

/**
 * المبلغ بالوحدة الصغرى (سنتيم) المُرسَل إلى YouCanPay tokenize. لا يوجد
 * مفهوم "Price object" في YouCanPay كما في Stripe — الخطة والمبلغ يُحسَبان
 * مباشرة عند كل عملية دفع.
 */
export function amountForPlan(plan: Exclude<PlanKey, "free">): number {
  return Math.round(PLAN_DISPLAY[plan].priceMad * 100);
}

export function isPlanKey(value: string): value is Exclude<PlanKey, "free"> {
  return value === "starter" || value === "pro" || value === "enterprise";
}
