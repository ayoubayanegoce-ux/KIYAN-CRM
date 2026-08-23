"use server";

import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { computeCrmStats } from "@/lib/analytics";
import { generateSalesInsight } from "@/lib/ai";
import { assertAiQuota, incrementAiUsage } from "@/lib/quota";

export async function getSalesInsight() {
  const { orgId } = await auth();
  if (!orgId) throw new Error("يجب اختيار منظمة أولاً");
  await assertAiQuota(orgId);

  const [{ data: leads, error: leadsError }, { data: deals, error: dealsError }] = await Promise.all([
    supabase.from("leads").select("ai_intent, status").eq("org_id", orgId),
    supabase.from("deals").select("deal_value, stage, win_probability").eq("org_id", orgId),
  ]);

  // لا نرمي خطأ هنا: عمود مفقود (مثلاً بعد ترحيل SQL لم يُنفَّذ بعد) يجب أن
  // يُنتج تحليلاً بلا بيانات كافية، لا أن يكسر زر "توليد التحليل" بالكامل.
  if (leadsError) console.error("Error fetching leads for sales insight:", leadsError);
  if (dealsError) console.error("Error fetching deals for sales insight:", dealsError);

  const stats = computeCrmStats(leads ?? [], deals ?? []);
  const insight = await generateSalesInsight(stats);
  await incrementAiUsage(orgId);
  return insight;
}
