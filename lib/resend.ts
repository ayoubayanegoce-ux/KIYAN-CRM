import { Resend } from "resend";
import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";
import { revalidatePath } from "next/cache";

const resend = new Resend(process.env.RESEND_API_KEY || "");

export type EmailSource = "manual" | "autopilot";

/**
 * Shared by the manually-triggered send action and the Auto-Pilot path.
 * Takes `orgId` explicitly (rather than resolving it via Clerk `auth()`)
 * so it also works from contexts with no Clerk session, like the webhook.
 */
export async function sendLeadEmail(
  orgId: string,
  leadId: string,
  subject: string,
  body: string,
  source: EmailSource = "manual"
) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("مفتاح RESEND_API_KEY غير مُعرَّف. أضفه إلى .env.local");
  }
  if (!subject.trim() || !body.trim()) {
    throw new Error("الموضوع والرسالة مطلوبان قبل الإرسال");
  }

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("email, name")
    .eq("id", leadId)
    .eq("org_id", orgId)
    .single();

  if (leadError || !lead) throw new Error("العميل غير موجود");

  const { error: sendError } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
    to: lead.email,
    subject,
    text: body,
    html: body.replace(/\n/g, "<br/>"),
  });

  if (sendError) throw new Error(sendError.message);

  const { error: updateError } = await supabase
    .from("leads")
    .update({ status: "contacted" })
    .eq("id", leadId)
    .eq("org_id", orgId);

  if (updateError) throw new Error(updateError.message);

  await logActivity({
    orgId,
    leadId,
    type: "email_sent",
    description:
      source === "autopilot"
        ? `📤 إرسال تلقائي عبر الطيار الآلي: "${subject}"`
        : `تم إرسال بريد تسويقي: "${subject}"`,
    metadata: { subject, source },
  });

  revalidatePath("/");
  return { success: true as const };
}
