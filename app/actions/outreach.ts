"use server";

import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { generateOutreachEmail } from "@/lib/ai";
import { getAISettings } from "@/app/actions/settings";

export async function generateOutreachForLead(leadId: string) {
  const { orgId } = await auth();
  if (!orgId) throw new Error("يجب اختيار منظمة أولاً");

  const { data: lead, error } = await supabase
    .from("leads")
    .select("name, company, ai_intent")
    .eq("id", leadId)
    .eq("org_id", orgId)
    .single();

  if (error || !lead) throw new Error("العميل غير موجود");

  const settings = await getAISettings();

  return generateOutreachEmail(lead.name, lead.company, lead.ai_intent, {
    tone: settings.tone,
    language: settings.language,
    valueProposition: settings.valueProposition,
  });
}
