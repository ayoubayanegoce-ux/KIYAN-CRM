import { supabase } from "@/lib/supabase";
import { generateOutreachEmail } from "@/lib/ai";
import { sendLeadEmail } from "@/lib/resend";

const AUTO_PILOT_SCORE_THRESHOLD = 80;

export type AutoPilotLead = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  ai_score: number | null;
  ai_intent: string | null;
};

function isQualified(lead: AutoPilotLead): boolean {
  return (lead.ai_score ?? 0) >= AUTO_PILOT_SCORE_THRESHOLD || lead.ai_intent === "hot";
}

/**
 * Called right after a lead is created/qualified (addLead, CSV import, the
 * webhook). No-ops silently unless BOTH the lead qualifies (score >= 80 or
 * intent === "hot") AND the org has Auto-Pilot enabled. Never throws —
 * a failed auto-send must not break lead creation itself.
 */
export async function maybeRunAutoPilot(orgId: string, lead: AutoPilotLead): Promise<void> {
  if (!isQualified(lead)) return;

  try {
    const { data: settings } = await supabase
      .from("org_settings")
      .select("autopilot_enabled")
      .eq("org_id", orgId)
      .maybeSingle();

    if (!settings?.autopilot_enabled) return;

    const { subject, body } = await generateOutreachEmail(lead.name, lead.company, lead.ai_intent);
    if (!subject.trim() || !body.trim()) {
      console.error("Auto-Pilot: email generation returned empty content, skipping send");
      return;
    }

    await sendLeadEmail(orgId, lead.id, subject, body, "autopilot");
  } catch (error) {
    console.error("Auto-Pilot send error:", error);
  }
}
