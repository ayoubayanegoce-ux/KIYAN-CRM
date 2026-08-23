import { supabase } from "@/lib/supabase";
import { PLAN_QUOTAS } from "@/lib/plans";

export class QuotaExceededError extends Error {
  constructor() {
    super(
      "لقد تجاوزت الحد الشهري المسموح به من استدعاءات الذكاء الاصطناعي لخطتك الحالية. قم بترقية خطتك من الإعدادات للمتابعة."
    );
    this.name = "QuotaExceededError";
  }
}

/**
 * true = يوجد حصة متاحة (أو تعذّر التحقق، فنُفضّل تمرير الطلب على كسر
 * الميزة كاملة بسبب خطأ في التحقق من الحصة — نفس فلسفة التساهل المعتمَدة
 * في باقي المشروع، مثل getAISettings). quota=0 يعني بلا حد أقصى (Enterprise).
 */
export async function hasAiQuota(orgId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("org_settings")
    .select("ai_usage_count, ai_monthly_quota")
    .eq("org_id", orgId)
    .maybeSingle();

  if (error) {
    console.error("تعذّر التحقق من حصة الذكاء الاصطناعي:", error);
    return true;
  }

  const used = data?.ai_usage_count ?? 0;
  const quota = data?.ai_monthly_quota ?? PLAN_QUOTAS.free;
  if (quota <= 0) return true;
  return used < quota;
}

/** يُستخدَم في المسارات التي يتوقّع فيها المستخدم رسالة خطأ واضحة عند الضغط على زر توليد. */
export async function assertAiQuota(orgId: string): Promise<void> {
  if (!(await hasAiQuota(orgId))) {
    throw new QuotaExceededError();
  }
}

/** لا يرمي أبداً — عدّاد استخدام تقريبي غير حرج، لا يجب أن يكسر التدفق الأساسي عند فشله. */
export async function incrementAiUsage(orgId: string): Promise<void> {
  try {
    const { data } = await supabase
      .from("org_settings")
      .select("ai_usage_count")
      .eq("org_id", orgId)
      .maybeSingle();

    const next = (data?.ai_usage_count ?? 0) + 1;
    await supabase
      .from("org_settings")
      .upsert({ org_id: orgId, ai_usage_count: next }, { onConflict: "org_id" });
  } catch (error) {
    console.error("تعذّر تحديث عدّاد استخدام الذكاء الاصطناعي:", error);
  }
}
