"use server";

import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import {
  generateOutreachEmail,
  generateSequenceSteps,
  generateSalesBattlecard,
  generateSuggestedReplies,
  SEQUENCE_STEP_LABELS_AR,
  SEQUENCE_CHANNEL_LABELS_AR,
  SEQUENCE_TASK_PREFIX,
  type SequenceStep,
  type SalesBattlecard,
  type SuggestedReply,
} from "@/lib/ai";
import { getAISettings } from "@/app/actions/settings";
import { getCrmContext } from "@/lib/crmContext";
import { assertAiQuota, incrementAiUsage } from "@/lib/quota";
import { sendLeadEmail } from "@/lib/resend";
import { getBookingUrl, bookingCtaText } from "@/lib/booking";
import { logActivity } from "@/lib/activity";
import { addFollowUpTask } from "@/app/actions/activities";
import { revalidatePath } from "next/cache";

async function getLeadForOutreach(leadId: string, orgId: string) {
  const { data: lead, error } = await supabase
    .from("leads")
    .select("name, company, ai_intent, enriched_data")
    .eq("id", leadId)
    .eq("org_id", orgId)
    .single();

  if (error || !lead) throw new Error("العميل غير موجود");
  return lead;
}

export async function generateOutreachForLead(leadId: string) {
  const { orgId } = await auth();
  if (!orgId) throw new Error("يجب اختيار منظمة أولاً");
  await assertAiQuota(orgId);

  const lead = await getLeadForOutreach(leadId, orgId);
  const [settings, companyContext] = await Promise.all([getAISettings(), getCrmContext(orgId)]);

  const result = await generateOutreachEmail(lead.name, lead.company, lead.ai_intent, {
    tone: settings.tone,
    language: settings.language,
    valueProposition: settings.valueProposition,
    companyContext,
    enrichedData: lead.enriched_data,
  });
  await incrementAiUsage(orgId);
  return result;
}

export async function generateSequenceForLead(leadId: string): Promise<SequenceStep[]> {
  const { orgId } = await auth();
  if (!orgId) throw new Error("يجب اختيار منظمة أولاً");
  await assertAiQuota(orgId);

  const lead = await getLeadForOutreach(leadId, orgId);
  const [settings, companyContext] = await Promise.all([getAISettings(), getCrmContext(orgId)]);

  const steps = await generateSequenceSteps(lead.name, lead.company, lead.ai_intent, {
    tone: settings.tone,
    language: settings.language,
    valueProposition: settings.valueProposition,
    companyContext,
    enrichedData: lead.enriched_data,
  });
  await incrementAiUsage(orgId);
  return steps;
}

/**
 * يعتمد المستخدم تسلسل المتابعة بعد مراجعته/تعديله: الخطوة الأولى تُرسَل
 * فوراً (بريد حقيقي، تماماً كإرسال يدوي عادي)، والخطوتان التاليتان تُجدوَلان
 * كمهام متابعة بتاريخ استحقاق مناسب (اليوم+3، اليوم+7) مع حفظ المسودة كاملة.
 */
export async function approveSequence(leadId: string, steps: SequenceStep[]) {
  const { orgId } = await auth();
  if (!orgId) throw new Error("يجب اختيار منظمة أولاً");
  if (steps.length !== 3) throw new Error("يجب أن يحتوي التسلسل على 3 خطوات بالضبط");
  if (steps.some((s) => !s.subject.trim() || !s.body.trim())) {
    throw new Error("يجب تعبئة عنوان ونص كل خطوة قبل الاعتماد");
  }

  const [firstStep, ...remainingSteps] = steps;

  await sendLeadEmail(orgId, leadId, firstStep.subject, firstStep.body, "manual");

  await supabase
    .from("leads")
    .update({ sequence_status: "active", sequence_step: 1 })
    .eq("id", leadId)
    .eq("org_id", orgId);

  // نُرفق رابط الحجز أيضاً بمسودات المهام المجدولة (نسخة نصية) كي يبقى جاهزاً
  // للنسخ عند إرسال الخطوة يدوياً لاحقاً — الإرسال الفعلي لا يمر عبر sendLeadEmail.
  const bookingUrl = await getBookingUrl(orgId);

  for (const step of remainingSteps) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + step.delayDays);
    const dueDateStr = dueDate.toISOString().slice(0, 10);
    const title = `${SEQUENCE_TASK_PREFIX}[${SEQUENCE_CHANNEL_LABELS_AR[step.channel]}] ${
      SEQUENCE_STEP_LABELS_AR[step.label]
    }: ${step.subject}`.slice(0, 200);
    const description = step.body + bookingCtaText(bookingUrl);

    await addFollowUpTask(leadId, title, dueDateStr, description, step.channel);
  }

  revalidatePath("/");
  return { success: true as const };
}

/**
 * زر بنقرة واحدة: يُستخدَم عندما يلاحظ المندوب رداً فعلياً من العميل (لا يوجد
 * كشف تلقائي للردود في هذا المشروع — لا تكامل مع صندوق البريد). يُسجَّل العميل
 * كـ "replied" ويُلغي أي خطوات تسلسل معلّقة تلقائياً حتى لا تُرسَل بعد فوات الأوان.
 */
export async function markLeadReplied(leadId: string) {
  const { orgId } = await auth();
  if (!orgId) throw new Error("يجب اختيار منظمة أولاً");

  const { error } = await supabase
    .from("leads")
    .update({ sequence_status: "replied" })
    .eq("id", leadId)
    .eq("org_id", orgId);

  if (error) throw new Error(error.message);

  const { data: pendingTasks } = await supabase
    .from("tasks")
    .select("id, title")
    .eq("org_id", orgId)
    .eq("lead_id", leadId)
    .eq("status", "pending");

  const sequenceTaskIds = (pendingTasks ?? [])
    .filter((t) => t.title.startsWith(SEQUENCE_TASK_PREFIX))
    .map((t) => t.id);

  if (sequenceTaskIds.length > 0) {
    await supabase.from("tasks").update({ status: "cancelled" }).in("id", sequenceTaskIds);
  }

  await logActivity({
    orgId,
    leadId,
    type: "sequence_paused",
    description: "✅ تم تسجيل رد العميل وإيقاف تسلسل المتابعة تلقائياً",
  });

  revalidatePath("/");
}

export async function generateBattlecardForLead(leadId: string): Promise<SalesBattlecard> {
  const { orgId } = await auth();
  if (!orgId) throw new Error("يجب اختيار منظمة أولاً");
  await assertAiQuota(orgId);

  const lead = await getLeadForOutreach(leadId, orgId);
  const [settings, companyContext] = await Promise.all([getAISettings(), getCrmContext(orgId)]);

  const card = await generateSalesBattlecard(lead.name, lead.company, lead.ai_intent, {
    tone: settings.tone,
    language: settings.language,
    valueProposition: settings.valueProposition,
    companyContext,
    enrichedData: lead.enriched_data,
  });
  await incrementAiUsage(orgId);
  return card;
}

/**
 * يُشغَّل من نافذة الملاحظات عندما يفتح المندوب رد وارد فعلي (ملاحظة من نوع
 * inbound_reply). لا نجلب الرد الوارد هنا — يُمرَّر نصه من الواجهة لأنه
 * محفوظ مسبقاً كمحتوى الملاحظة نفسها.
 */
export async function generateSuggestedRepliesForLead(
  leadId: string,
  inboundMessage: string
): Promise<SuggestedReply[]> {
  const { orgId } = await auth();
  if (!orgId) throw new Error("يجب اختيار منظمة أولاً");
  await assertAiQuota(orgId);

  const lead = await getLeadForOutreach(leadId, orgId);
  const [settings, companyContext] = await Promise.all([getAISettings(), getCrmContext(orgId)]);

  const replies = await generateSuggestedReplies(inboundMessage, lead.name, {
    tone: settings.tone,
    language: settings.language,
    valueProposition: settings.valueProposition,
    companyContext,
    bookingUrl: settings.bookingUrl,
  });
  await incrementAiUsage(orgId);
  return replies;
}
