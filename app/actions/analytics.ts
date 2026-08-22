"use server";

import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { computeCrmStats } from "@/lib/analytics";
import { generateSalesInsight } from "@/lib/ai";

export async function getSalesInsight() {
  const { orgId } = await auth();
  if (!orgId) throw new Error("يجب اختيار منظمة أولاً");

  const [{ data: leads, error: leadsError }, { data: deals, error: dealsError }] = await Promise.all([
    supabase.from("leads").select("ai_intent, status").eq("org_id", orgId),
    supabase.from("deals").select("value, stage").eq("org_id", orgId),
  ]);

  if (leadsError) throw new Error(leadsError.message);
  if (dealsError) throw new Error(dealsError.message);

  const stats = computeCrmStats(leads ?? [], deals ?? []);
  return generateSalesInsight(stats);
}
