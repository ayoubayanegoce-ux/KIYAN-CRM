import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";
import { claimPaymentOrder, type PaymentOrder } from "@/lib/paymentOrders";
import { PLAN_QUOTAS, type PlanKey } from "@/lib/plans";

type YouCanPayWebhookEvent = {
  id: string;
  event_name: string;
  sandbox: boolean;
  payload: {
    transaction: {
      id: string;
      amount: string;
      status: number;
      currency: string;
      order_id: string;
    };
  };
};

/**
 * YouCanPay لا يوثّق أي توقيع/HMAC للتحقق من مصدر الويب هوك (بخلاف
 * stripe-signature عند Stripe). خط الدفاع هنا هو claimPaymentOrder: لا يُعتمَد
 * أي حدث إلا إذا طابق order_id/amount/currency طلباً pending أنشأناه نحن
 * فعلاً، ويُعالَج كل order_id مرة واحدة فقط (WHERE status='pending' الذري).
 */
export async function POST(request: Request) {
  let event: YouCanPayWebhookEvent;
  try {
    event = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const transaction = event.payload?.transaction;
  if (!transaction?.order_id) {
    return NextResponse.json({ received: true });
  }

  if (event.event_name === "transaction.paid") {
    const order = await claimPaymentOrder(transaction.order_id, transaction.amount, transaction.currency, "paid");
    if (order) {
      if (order.kind === "subscription") {
        await activateSubscription(order);
      } else {
        await markDealPaid(order);
      }
    }
  } else if (event.event_name === "transaction.failed") {
    const order = await claimPaymentOrder(transaction.order_id, transaction.amount, transaction.currency, "failed");
    if (order && order.kind === "deal") {
      await markDealFailed(order);
    }
  }

  return NextResponse.json({ received: true });
}

async function activateSubscription(order: PaymentOrder) {
  const plan = (order.plan ?? "free") as PlanKey;

  const planExpiresAt = new Date();
  planExpiresAt.setMonth(planExpiresAt.getMonth() + 1);

  const { error } = await supabase.from("org_settings").upsert(
    {
      org_id: order.org_id,
      plan,
      subscription_status: "active",
      plan_expires_at: planExpiresAt.toISOString(),
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
    orgId: order.org_id,
    type: "payment_received",
    description: `✅ تم تفعيل اشتراك ${plan} بنجاح عبر YouCanPay`,
    metadata: { order_id: order.order_id, plan },
  });
}

async function markDealPaid(order: PaymentOrder) {
  if (!order.deal_id) return;

  const { data: deal, error } = await supabase
    .from("deals")
    .select("id, title, payment_status")
    .eq("id", order.deal_id)
    .eq("org_id", order.org_id)
    .single();

  if (error || !deal || deal.payment_status === "paid") return;

  await supabase
    .from("deals")
    .update({ payment_status: "paid", stage: "won" })
    .eq("id", order.deal_id)
    .eq("org_id", order.org_id);

  await logActivity({
    orgId: order.org_id,
    dealId: order.deal_id,
    type: "payment_received",
    description: `✅ تم استلام الدفع عبر YouCanPay للصفقة "${deal.title}"`,
    metadata: { order_id: order.order_id },
  });
}

async function markDealFailed(order: PaymentOrder) {
  if (!order.deal_id) return;

  const { data: deal } = await supabase
    .from("deals")
    .select("id, title")
    .eq("id", order.deal_id)
    .eq("org_id", order.org_id)
    .single();

  if (!deal) return;

  await supabase
    .from("deals")
    .update({ payment_status: "failed" })
    .eq("id", order.deal_id)
    .eq("org_id", order.org_id);

  await logActivity({
    orgId: order.org_id,
    dealId: order.deal_id,
    type: "payment_failed",
    description: `⚠️ فشل الدفع عبر YouCanPay للصفقة "${deal.title}"`,
    metadata: { order_id: order.order_id },
  });
}
