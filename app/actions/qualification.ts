"use server";

import { qualifyLead } from "@/lib/ai";
import { getCrmContext } from "@/lib/crmContext";

/**
 * Canonical, context-aware entry point for lead qualification used by the
 * authenticated app (addLead, CSV import). Reads CRM_CONTEXT.md and injects
 * it as system context into the Gemini prompt automatically — callers never
 * need to fetch or pass the context themselves.
 */
export async function qualifyLeadWithContext(name: string, email: string, company: string) {
  const context = await getCrmContext();
  return qualifyLead(name, email, company, context);
}
