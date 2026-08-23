"use server";

import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { findProspectCandidates, type ProspectCandidate } from "@/lib/ai";
import { qualifyLeadWithContext } from "@/app/actions/qualification";
import { enrichCompanyProfile } from "@/lib/ai";
import { logActivity } from "@/lib/activity";
import { maybeRunAutoPilot } from "@/lib/autopilot";
import { notifyHotLeadViaTelegram } from "@/lib/telegram";
import { assertAiQuota, incrementAiUsage } from "@/lib/quota";
import { revalidatePath } from "next/cache";

export type { ProspectCandidate };

export async function findProspects(industry: string, location: string): Promise<ProspectCandidate[]> {
  const { orgId } = await auth();
  if (!orgId) throw new Error("يجب اختيار منظمة أولاً");
  if (!industry.trim()) throw new Error("قطاع النشاط مطلوب");
  await assertAiQuota(orgId);

  const results = await findProspectCandidates(industry.trim(), location.trim());
  await incrementAiUsage(orgId);
  return results;
}

/**
 * يستورد شركة تقديرية (من نتائج المحرك التوضيحي) كعميل محتمل فعلي في
 * الـ CRM، ويشغّل نفس دورة التأهيل/الإثراء المستخدَمة في addLead. نُدرج
 * ملاحظة توضح أن البيانات مصدرها اقتراح ذكاء اصطناعي محاكى، وليست بيانات
 * تحقّق منها بشرياً — حتى لا يُساء فهمها كبيانات مؤكدة عند التواصل الفعلي.
 */
export async function importProspectAsLead(candidate: ProspectCandidate): Promise<{ id: string }> {
  const { orgId } = await auth();
  if (!orgId) throw new Error("يجب اختيار منظمة أولاً");
  if (!candidate.companyName.trim()) throw new Error("بيانات الشركة غير صالحة");

  const name = candidate.suggestedContactName.trim() || candidate.suggestedTitle.trim() || candidate.companyName;
  const email = candidate.estimatedEmail.trim();
  const company = candidate.companyName.trim();

  const [{ ai_score, ai_intent, reasoning }, enrichedData] = await Promise.all([
    qualifyLeadWithContext(name, email, company, orgId),
    enrichCompanyProfile(company),
  ]);

  const { data, error } = await supabase
    .from("leads")
    .insert([
      {
        org_id: orgId,
        name,
        email,
        company,
        status: "new",
        ai_score,
        ai_intent,
        enriched_data: enrichedData,
      },
    ])
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  await logActivity({
    orgId,
    leadId: data.id,
    type: "lead_created",
    description: `🔎 تم استيراد عميل محتمل من محرك البحث التوضيحي: ${name} (${company})`,
  });
  await logActivity({
    orgId,
    leadId: data.id,
    type: "note_added",
    description: `⚠️ بيانات تقديرية مولَّدة بالذكاء الاصطناعي (محاكاة) — تحقّق منها قبل أي تواصل فعلي. المنصب المقترح: ${
      candidate.suggestedTitle || "غير محدد"
    }.`,
  });
  await logActivity({
    orgId,
    leadId: data.id,
    type: "ai_qualified",
    description: `تقييم الذكاء الاصطناعي: ${ai_score}/100 (${ai_intent})`,
    metadata: { ai_score, ai_intent, reasoning },
  });

  if (ai_intent === "hot") {
    await notifyHotLeadViaTelegram(orgId, {
      name,
      email,
      company,
      ai_score,
      ai_intent,
      painPoints: enrichedData?.painPoints,
    });
  }

  await maybeRunAutoPilot(orgId, { id: data.id, name, email, company, ai_score, ai_intent, enrichedData });

  revalidatePath("/");
  return { id: data.id };
}
