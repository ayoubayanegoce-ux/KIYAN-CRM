import { NextResponse } from "next/server";
import { Resend } from "resend";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";
import { SEQUENCE_TASK_PREFIX } from "@/lib/ai";

const resend = new Resend(process.env.RESEND_API_KEY || "");

type InboundEmailEvent = {
  type: string;
  data: {
    from?: string;
    email_id?: string;
    subject?: string;
  };
};

/**
 * يستقبل حدث email.received من Resend عند وصول رد من عميل. نفس منظمة
 * الويب هوك الخارجي الافتراضية المستخدَمة في webhooks/calendly و
 * webhooks/lead (WEBHOOK_DEFAULT_ORG_ID) — صندوق الرد الوارد واحد على
 * مستوى المنصة، وليس لكل عميل. لا نعيد استخدام markLeadReplied (server
 * action) لأنها تعتمد على Clerk auth() لجلسة مستخدم لا وجود لها هنا.
 *
 * نفس فلسفة webhooks/calendly بالضبط: التحقق من التوقيع اختياري بحسب توفّر
 * السر — إن كان RESEND_WEBHOOK_SECRET فارغاً (بيئة تطوير مثلاً)، تُقبَل
 * الحمولة كما هي دون التحقق بدل رفض الطلب بالكامل. لا نطبّق هذا التساهل في
 * الإنتاج فعلياً إلا لأن السر ما زال غير مُعرَّف — أضِفه بمجرد توفره.
 */
export async function POST(request: Request) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  const rawBody = await request.text();

  let event: InboundEmailEvent;

  if (webhookSecret) {
    const svixId = request.headers.get("svix-id");
    const svixTimestamp = request.headers.get("svix-timestamp");
    const svixSignature = request.headers.get("svix-signature");
    if (!svixId || !svixTimestamp || !svixSignature) {
      return NextResponse.json({ error: "Missing svix signature headers" }, { status: 400 });
    }

    try {
      event = resend.webhooks.verify({
        payload: rawBody,
        headers: { id: svixId, timestamp: svixTimestamp, signature: svixSignature },
        webhookSecret,
      }) as InboundEmailEvent;
    } catch (err) {
      console.error("Resend inbound webhook signature verification failed:", err);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
  } else {
    console.error(
      "RESEND_WEBHOOK_SECRET غير مُعرَّف — الويب هوك يقبل الطلبات بدون التحقق من التوقيع."
    );
    try {
      event = JSON.parse(rawBody) as InboundEmailEvent;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
  }

  if (event.type !== "email.received") {
    return NextResponse.json({ received: true, ignored: true });
  }

  const fromEmail = event.data.from?.trim().toLowerCase();
  if (!fromEmail) {
    return NextResponse.json({ received: true, matched: false });
  }

  const orgId = process.env.WEBHOOK_DEFAULT_ORG_ID;
  if (!orgId) {
    console.error("WEBHOOK_DEFAULT_ORG_ID غير مُعرَّف");
    return NextResponse.json({ error: "Default organization not configured" }, { status: 503 });
  }

  const { data: lead } = await supabase
    .from("leads")
    .select("id, name")
    .eq("org_id", orgId)
    .eq("email", fromEmail)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!lead) {
    console.error(`Resend inbound reply لبريد غير معروف لدينا: ${fromEmail}`);
    return NextResponse.json({ received: true, matched: false });
  }

  // نجلب نص الرسالة الكامل (وليس فقط الميتاداتا في حمولة الويب هوك) حتى
  // يتوفر محتوى فعلي لتحليله لاحقاً عبر "اقتراح رد ذكي" في نافذة الملاحظات.
  let inboundText = "";
  if (event.data.email_id) {
    try {
      const { data: emailContent } = await resend.emails.receiving.get(event.data.email_id);
      inboundText = (emailContent?.text || "").trim();
    } catch (err) {
      console.error("Failed to fetch inbound email content:", err);
    }
  }
  if (!inboundText) inboundText = event.data.subject || "(بدون محتوى نصي)";

  await supabase.from("notes").insert([
    {
      org_id: orgId,
      lead_id: lead.id,
      type: "inbound_reply",
      content: inboundText.slice(0, 5000),
    },
  ]);

  await supabase
    .from("leads")
    .update({ sequence_status: "replied", status: "contacted" })
    .eq("id", lead.id)
    .eq("org_id", orgId);

  const { data: pendingTasks } = await supabase
    .from("tasks")
    .select("id, title")
    .eq("org_id", orgId)
    .eq("lead_id", lead.id)
    .eq("status", "pending");

  const sequenceTaskIds = (pendingTasks ?? [])
    .filter((t) => t.title.startsWith(SEQUENCE_TASK_PREFIX))
    .map((t) => t.id);

  if (sequenceTaskIds.length > 0) {
    await supabase.from("tasks").update({ status: "cancelled" }).in("id", sequenceTaskIds);
  }

  await logActivity({
    orgId,
    leadId: lead.id,
    type: "sequence_paused",
    description: `✅ تم رصد رد العميل "${lead.name}" عبر البريد تلقائياً، وإيقاف تسلسل المتابعة`,
  });

  revalidatePath("/");
  return NextResponse.json({ received: true, matched: true });
}
