"use server";

import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { generateOutreachEmail, generateSequenceSteps, SEQUENCE_STEP_LABELS_AR, type SequenceStep } from "@/lib/ai";
import { getAISettings } from "@/app/actions/settings";
import { getCrmContext } from "@/lib/crmContext";
import { sendLeadEmail } from "@/lib/resend";
import { addFollowUpTask } from "@/app/actions/activities";

async function getLeadForOutreach(leadId: string, orgId: string) {
  const { data: lead, error } = await supabase
    .from("leads")
    .select("name, company, ai_intent")
    .eq("id", leadId)
    .eq("org_id", orgId)
    .single();

  if (error || !lead) throw new Error("العميل غير موجود");
  return lead;
}

export async function generateOutreachForLead(leadId: string) {
  const { orgId } = await auth();
  if (!orgId) throw new Error("يجب اختيار منظمة أولاً");

  const lead = await getLeadForOutreach(leadId, orgId);
  const [settings, companyContext] = await Promise.all([getAISettings(), getCrmContext()]);

  return generateOutreachEmail(lead.name, lead.company, lead.ai_intent, {
    tone: settings.tone,
    language: settings.language,
    valueProposition: settings.valueProposition,
    companyContext,
  });
}

export async function generateSequenceForLead(leadId: string): Promise<SequenceStep[]> {
  const { orgId } = await auth();
  if (!orgId) throw new Error("يجب اختيار منظمة أولاً");

  const lead = await getLeadForOutreach(leadId, orgId);
  const [settings, companyContext] = await Promise.all([getAISettings(), getCrmContext()]);

  return generateSequenceSteps(lead.name, lead.company, lead.ai_intent, {
    tone: settings.tone,
    language: settings.language,
    valueProposition: settings.valueProposition,
    companyContext,
  });
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

  for (const step of remainingSteps) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + step.delayDays);
    const dueDateStr = dueDate.toISOString().slice(0, 10);
    const title = `📧 ${SEQUENCE_STEP_LABELS_AR[step.label]}: ${step.subject}`.slice(0, 200);

    await addFollowUpTask(leadId, title, dueDateStr, step.body);
  }

  return { success: true as const };
}
