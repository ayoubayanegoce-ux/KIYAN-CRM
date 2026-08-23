import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";

const REPLAY_TOLERANCE_SECONDS = 180;

/**
 * Verifies Calendly's HMAC-SHA256 webhook signature per their documented
 * spec: header "Calendly-Webhook-Signature: t=<unix_ts>,v1=<hex_hmac>",
 * signed payload = `${t}.${rawBody}`. Includes the replay-attack timestamp
 * tolerance check Calendly's own docs recommend (3 minutes).
 */
function isValidSignature(signatureHeader: string, rawBody: string, signingKey: string): boolean {
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((pair) => {
      const [key, value] = pair.split("=");
      return [key, value];
    })
  );

  const timestamp = parts["t"];
  const providedSignature = parts["v1"];
  if (!timestamp || !providedSignature) return false;

  const timestampSeconds = Number(timestamp);
  if (!Number.isFinite(timestampSeconds)) return false;
  if (Math.abs(Date.now() / 1000 - timestampSeconds) > REPLAY_TOLERANCE_SECONDS) return false;

  const signedPayload = `${timestamp}.${rawBody}`;
  const expectedSignature = createHmac("sha256", signingKey).update(signedPayload).digest("hex");

  const expectedBuf = Buffer.from(expectedSignature);
  const providedBuf = Buffer.from(providedSignature);
  if (expectedBuf.length !== providedBuf.length) return false;
  return timingSafeEqual(expectedBuf, providedBuf);
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  const signingKey = process.env.CALENDLY_WEBHOOK_SIGNING_KEY;
  if (signingKey) {
    const signatureHeader = request.headers.get("calendly-webhook-signature");
    if (!signatureHeader || !isValidSignature(signatureHeader, rawBody, signingKey)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  } else {
    console.error(
      "CALENDLY_WEBHOOK_SIGNING_KEY غير مُعرَّف — الويب هوك يقبل الطلبات بدون التحقق من التوقيع."
    );
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const body = payload as { event?: string; payload?: { email?: string; name?: string } };

  if (body.event !== "invitee.created") {
    return NextResponse.json({ success: true, ignored: true }, { status: 200 });
  }

  const email = body.payload?.email;
  if (!email) {
    return NextResponse.json({ error: "لا يوجد بريد إلكتروني في الحدث" }, { status: 400 });
  }

  // نفس منظمة الويب هوك الخارجي الافتراضية — حساب Calendly تابع لصاحب المنصة
  // نفسه وليس لكل عميل، تماماً مثل بنية app/api/webhooks/lead.
  const orgId = process.env.WEBHOOK_DEFAULT_ORG_ID;
  if (!orgId) {
    console.error("WEBHOOK_DEFAULT_ORG_ID is not configured");
    return NextResponse.json({ error: "Default organization not configured" }, { status: 503 });
  }

  const { data: lead } = await supabase
    .from("leads")
    .select("id, name")
    .eq("org_id", orgId)
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!lead) {
    console.error(`Calendly booking لبريد غير معروف لدينا: ${email}`);
    return NextResponse.json({ success: true, matched: false }, { status: 200 });
  }

  await logActivity({
    orgId,
    leadId: lead.id,
    type: "meeting_scheduled",
    description: `📅 تم حجز موعد عبر Calendly مع ${lead.name}`,
  });

  const { data: deal } = await supabase
    .from("deals")
    .select("id, stage")
    .eq("org_id", orgId)
    .eq("lead_id", lead.id)
    .not("stage", "in", "(won,lost)")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (deal) {
    await supabase
      .from("deals")
      .update({ stage: "meeting_scheduled" })
      .eq("id", deal.id)
      .eq("org_id", orgId);

    await logActivity({
      orgId,
      leadId: lead.id,
      dealId: deal.id,
      type: "deal_stage_changed",
      description: 'تم نقل الصفقة تلقائياً إلى "Meeting Scheduled" بعد حجز موعد عبر Calendly',
      metadata: { from: deal.stage, to: "meeting_scheduled", source: "calendly" },
    });
  }

  revalidatePath("/");
  return NextResponse.json({ success: true }, { status: 200 });
}
