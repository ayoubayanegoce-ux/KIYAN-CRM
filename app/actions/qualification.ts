"use server";

import { qualifyLead } from "@/lib/ai";
import { getCrmContext } from "@/lib/crmContext";
import { hasAiQuota, incrementAiUsage } from "@/lib/quota";

/**
 * Canonical, context-aware entry point for lead qualification used by the
 * authenticated app (addLead, CSV import). Reads the org's dynamic context
 * from org_settings and injects it as system context into the Gemini prompt
 * automatically — callers never need to fetch or pass the context themselves.
 *
 * Quota-gated but never blocks lead creation: if the org's monthly AI quota
 * is exhausted, returns a safe neutral default instead of throwing (same
 * resilience pattern as qualifyLead's own try/catch) — creating a lead must
 * never fail just because AI quota ran out.
 */
export async function qualifyLeadWithContext(name: string, email: string, company: string, orgId: string) {
  if (!(await hasAiQuota(orgId))) {
    return { ai_score: 0, ai_intent: "cold" as const, reasoning: "تم تجاوز الحصة الشهرية للذكاء الاصطناعي" };
  }

  const context = await getCrmContext(orgId);
  const result = await qualifyLead(name, email, company, context);
  await incrementAiUsage(orgId);
  return result;
}
