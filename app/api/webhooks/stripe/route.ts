import type Stripe from "stripe";
import { NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe";
import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";

/**
 * التحقق الفعلي من حالة الدفع (تحويل payment_status إلى "paid") يحدث حصراً
 * هنا — وليس في server action إنشاء الجلسة ولا في صفحة النجاح — لأن العميل
 * قد يدفع بنجاح ثم يفقد الاتصال قبل الوصول لصفحة النجاح. نتعامل مع كلا
 * الحدثين completed/async_payment_succeeded ونتحقق من payment_status لتفادي
 * تفعيل صفقة لم يُدفع ثمنها فعلياً بعد (طرق دفع مؤجلة الإشعار).
 */
export async function POST(request: Request) {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
    console.error("Stripe webhook received but STRIPE_SECRET_KEY/STRIPE_WEBHOOK_SECRET غير مُعرَّفين");
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status !== "unpaid") {
      await markDealPaid(session);
    }
  } else if (event.type === "checkout.session.async_payment_failed") {
    const session = event.data.object as Stripe.Checkout.Session;
    await markDealFailed(session);
  }

  return NextResponse.json({ received: true });
}

async function markDealPaid(session: Stripe.Checkout.Session) {
  const dealId = session.metadata?.deal_id;
  const orgId = session.metadata?.org_id;
  if (!dealId || !orgId) return;

  const { data: deal, error } = await supabase
    .from("deals")
    .select("id, title, payment_status")
    .eq("id", dealId)
    .eq("org_id", orgId)
    .single();

  if (error || !deal || deal.payment_status === "paid") return;

  await supabase
    .from("deals")
    .update({ payment_status: "paid", stage: "won" })
    .eq("id", dealId)
    .eq("org_id", orgId);

  await logActivity({
    orgId,
    dealId,
    type: "payment_received",
    description: `✅ تم استلام الدفع عبر Stripe للصفقة "${deal.title}"`,
    metadata: { stripe_session_id: session.id, amount_total: session.amount_total },
  });
}

async function markDealFailed(session: Stripe.Checkout.Session) {
  const dealId = session.metadata?.deal_id;
  const orgId = session.metadata?.org_id;
  if (!dealId || !orgId) return;

  const { data: deal } = await supabase
    .from("deals")
    .select("id, title")
    .eq("id", dealId)
    .eq("org_id", orgId)
    .single();

  if (!deal) return;

  await supabase
    .from("deals")
    .update({ payment_status: "failed" })
    .eq("id", dealId)
    .eq("org_id", orgId);

  await logActivity({
    orgId,
    dealId,
    type: "payment_failed",
    description: `⚠️ فشل الدفع عبر Stripe للصفقة "${deal.title}"`,
    metadata: { stripe_session_id: session.id },
  });
}
