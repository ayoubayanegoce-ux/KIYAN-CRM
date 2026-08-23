import type Stripe from "stripe";
import { NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe";
import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";
import { PLAN_QUOTAS, planFromPriceId } from "@/lib/plans";

/**
 * التحقق الفعلي من حالة الدفع/الاشتراك يحدث حصراً هنا — وليس في server
 * actions إنشاء الجلسات ولا في صفحة النجاح — لأن العميل قد يدفع بنجاح ثم
 * يفقد الاتصال قبل الوصول لصفحة النجاح. نتعامل مع كلا الحدثين
 * completed/async_payment_succeeded ونتحقق من payment_status لتفادي تفعيل
 * صفقة/اشتراك لم يُدفع ثمنه فعلياً بعد (طرق دفع مؤجلة الإشعار).
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

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status === "unpaid") break;

      if (session.mode === "subscription") {
        await activateSubscriptionFromSession(stripe, session);
      } else {
        await markDealPaid(session);
      }
      break;
    }
    case "checkout.session.async_payment_failed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== "subscription") {
        await markDealFailed(session);
      }
      break;
    }
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      await syncOrgSubscription(subscription);
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await cancelOrgSubscription(subscription);
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}

async function resolveOrgId(subscriptionMetadataOrgId?: string, customerId?: string | null): Promise<string | null> {
  if (subscriptionMetadataOrgId) return subscriptionMetadataOrgId;
  if (!customerId) return null;

  const { data } = await supabase
    .from("org_settings")
    .select("org_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  return data?.org_id ?? null;
}

async function activateSubscriptionFromSession(stripe: Stripe, session: Stripe.Checkout.Session) {
  const orgId = session.metadata?.org_id || session.client_reference_id;
  if (!orgId) return;

  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
  if (!customerId || !subscriptionId) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const priceId = subscription.items.data[0]?.price.id;
  const plan = planFromPriceId(priceId);

  const { error } = await supabase.from("org_settings").upsert(
    {
      org_id: orgId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      plan,
      subscription_status: "active",
      ai_monthly_quota: PLAN_QUOTAS[plan],
      ai_usage_count: 0,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "org_id" }
  );

  if (error) {
    console.error("Error activating subscription in org_settings:", error);
    return;
  }

  await logActivity({
    orgId,
    type: "payment_received",
    description: `✅ تم تفعيل اشتراك ${plan} بنجاح عبر Stripe`,
    metadata: { stripe_subscription_id: subscriptionId, plan },
  });
}

async function syncOrgSubscription(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
  const orgId = await resolveOrgId(subscription.metadata?.org_id, customerId);
  if (!orgId) return;

  const priceId = subscription.items.data[0]?.price.id;
  const plan = planFromPriceId(priceId);
  const isActive = subscription.status === "active" || subscription.status === "trialing";

  const { error } = await supabase
    .from("org_settings")
    .update({
      plan: isActive ? plan : "free",
      subscription_status: subscription.status,
      ai_monthly_quota: isActive ? PLAN_QUOTAS[plan] : PLAN_QUOTAS.free,
      stripe_subscription_id: subscription.id,
    })
    .eq("org_id", orgId);

  if (error) {
    console.error("Error syncing subscription update:", error);
    return;
  }

  await logActivity({
    orgId,
    type: "payment_received",
    description: `🔄 تحديث حالة الاشتراك: ${subscription.status} (${plan})`,
    metadata: { stripe_subscription_id: subscription.id, status: subscription.status, plan },
  });
}

async function cancelOrgSubscription(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
  const orgId = await resolveOrgId(subscription.metadata?.org_id, customerId);
  if (!orgId) return;

  const { error } = await supabase
    .from("org_settings")
    .update({
      plan: "free",
      subscription_status: "cancelled",
      ai_monthly_quota: PLAN_QUOTAS.free,
    })
    .eq("org_id", orgId);

  if (error) {
    console.error("Error cancelling subscription:", error);
    return;
  }

  await logActivity({
    orgId,
    type: "payment_failed",
    description: "⚠️ تم إلغاء الاشتراك — تم الرجوع إلى الخطة المجانية (Free)",
    metadata: { stripe_subscription_id: subscription.id },
  });
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
