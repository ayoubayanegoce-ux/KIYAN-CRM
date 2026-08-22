"use server";

import { auth } from "@clerk/nextjs/server";
import { sendLeadEmail } from "@/lib/resend";

export async function sendOutreachEmail(leadId: string, subject: string, body: string) {
  const { orgId } = await auth();
  if (!orgId) throw new Error("يجب اختيار منظمة أولاً");

  return sendLeadEmail(orgId, leadId, subject, body, "manual");
}
