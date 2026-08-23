import { supabase } from "@/lib/supabase";

/**
 * سياق افتراضي متزن (لا يفترض أي شركة أو منتج محدد) يُستخدَم كلما كانت
 * حقول org_settings فارغة أو المنظمة لم تُكمل الإعداد بعد — لتجنّب أي توقف
 * أو ادّعاء معلومات غير صحيحة في مخرجات الذكاء الاصطناعي.
 */
const DEFAULT_COMPANY_CONTEXT =
  "شركة B2B عامة تقدّم حلولاً أو خدمات لعملاء من الشركات الأخرى. حافظ على نبرة احترافية ومحايدة، ولا تدّعِ أي معلومات محددة عن شركة أو منتج غير معروف لديك.";
const DEFAULT_ICP =
  "شركات صغيرة ومتوسطة (SME) تبحث عن تحسين عملية المبيعات والتواصل مع العملاء المحتملين.";
const DEFAULT_OFFERS =
  "حلول وخدمات B2B تساعد على تحسين الكفاءة التشغيلية وزيادة المبيعات.";

type OrgContextRow = {
  org_display_name: string | null;
  ai_value_proposition: string | null;
  icp: string | null;
  pricing_offers: string | null;
};

function buildContext(row: OrgContextRow | null): string {
  const displayName = row?.org_display_name?.trim();
  const companyContext = row?.ai_value_proposition?.trim() || DEFAULT_COMPANY_CONTEXT;
  const icp = row?.icp?.trim() || DEFAULT_ICP;
  const offers = row?.pricing_offers?.trim() || DEFAULT_OFFERS;

  return [
    displayName ? `اسم الشركة: ${displayName}` : "",
    `نبذة عن الشركة ونشاطها: ${companyContext}`,
    `العميل المستهدف (ICP): ${icp}`,
    `العروض والأسعار: ${offers}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * يبني سياق الذكاء الاصطناعي ديناميكياً من إعدادات المنظمة (org_settings)
 * بدلاً من ملف CRM_CONTEXT.md الثابت — كل منظمة (org_id) لها سياقها الخاص
 * (النبذة، العميل المستهدف، العروض)، ما يجعل التطبيق SaaS متعدد المستأجرين
 * فعلياً على مستوى الذكاء الاصطناعي وليس فقط على مستوى البيانات. لا يرمي
 * أبداً — يتدهور بأمان إلى قيم افتراضية متزنة عند أي خطأ أو حقول فارغة.
 */
export async function getCrmContext(orgId: string): Promise<string> {
  try {
    const { data, error } = await supabase
      .from("org_settings")
      .select("org_display_name, ai_value_proposition, icp, pricing_offers")
      .eq("org_id", orgId)
      .maybeSingle();

    if (error) {
      console.error("تعذّر جلب سياق المنظمة، سيُستخدم سياق افتراضي آمن:", error);
      return buildContext(null);
    }
    return buildContext(data);
  } catch (error) {
    console.error("تعذّر جلب سياق المنظمة، سيُستخدم سياق افتراضي آمن:", error);
    return buildContext(null);
  }
}
