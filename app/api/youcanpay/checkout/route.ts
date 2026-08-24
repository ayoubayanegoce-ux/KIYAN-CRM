import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { isYouCanPayConfigured, tokenizePayment } from "@/lib/youcanpay";
import { getAppUrl } from "@/lib/appUrl";
import { createPendingOrder, attachTokenToOrder } from "@/lib/paymentOrders";
import { amountForPlan, isPlanKey } from "@/lib/plans";

const CHECKOUT_CURRENCY = "mad";

/**
 * يُنشئ طلب دفع YouCanPay (pending في payment_orders) لخطة Starter/Pro/Enterprise
 * ويُعيد orderId — العميل يفتح /pay/[orderId] لإتمام الدفع عبر yp.js. تفعيل
 * الخطة فعلياً يحدث حصراً عبر الويب هوك (app/api/webhooks/youcanpay) بعد
 * transaction.paid، وليس من هذا المسار.
 */
export async function POST(request: Request) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ error: "يجب تسجيل الدخول واختيار منظمة أولاً" }, { status: 401 });
  }

  if (!isYouCanPayConfigured()) {
    return NextResponse.json(
      { error: "YouCanPay غير مُهيَّأ: أضف YOUCANPAY_PRIVATE_KEY و NEXT_PUBLIC_YOUCANPAY_PUBLIC_KEY" },
      { status: 503 }
    );
  }

  let body: { plan?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  if (!body.plan || !isPlanKey(body.plan)) {
    return NextResponse.json({ error: "يجب تحديد خطة صالحة (starter/pro/enterprise)" }, { status: 400 });
  }
  const plan = body.plan;

  const appUrl = await getAppUrl();
  const amount = amountForPlan(plan);

  const orderId = await createPendingOrder({ orgId, kind: "subscription", plan, amount, currency: CHECKOUT_CURRENCY });

  try {
    const { token, transactionId } = await tokenizePayment({
      orderId,
      amount,
      currency: CHECKOUT_CURRENCY,
      successUrl: `${appUrl}/billing?subscribed=success`,
      errorUrl: `${appUrl}/billing?subscribed=cancelled`,
      metadata: { org_id: orgId, plan },
    });
    await attachTokenToOrder(orderId, token, transactionId);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "تعذّر بدء الاشتراك" }, { status: 500 });
  }

  return NextResponse.json({ orderId });
}
