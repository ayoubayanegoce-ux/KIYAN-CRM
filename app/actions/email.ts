"use server";

import { Resend } from "resend";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

const resend = new Resend(process.env.RESEND_API_KEY || "");

export async function sendOutreachEmail(leadId: string, subject: string, body: string) {
  const { orgId } = await auth();
  if (!orgId) throw new Error("يجب اختيار منظمة أولاً");

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

  revalidatePath("/");
  return { success: true as const };
}
