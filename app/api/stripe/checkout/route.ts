import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getStripeClient } from "@/lib/stripe";
import { getAppUrl } from "@/lib/appUrl";
import { supabase } from "@/lib/supabase";
import { priceIdForPlan, isPlanKey } from "@/lib/plans";

/**
 * ينشئ جلسة اشتراك Stripe (mode: "subscription") لخطة Starter/Pro/Enterprise.
 * تفعيل الخطة فعلياً (تحديث org_settings.plan) يحدث حصراً عبر الويب هوك
 * بعد checkout.session.completed — هذا المسار فقط يبدأ الجلسة ويُعيد رابطها.
 */
export async function POST(request: Request) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ error: "يجب تسجيل الدخول واختيار منظمة أولاً" }, { status: 401 });
  }

  const stripe = getStripeClient();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe غير مُهيَّأ: أضف STRIPE_SECRET_KEY" }, { status: 503 });
  }

  let body: { plan?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const plan = body.plan;
  if (!plan || !isPlanKey(plan)) {
    return NextResponse.json({ error: "خطة غير صالحة" }, { status: 400 });
  }

  const priceId = priceIdForPlan(plan);
  if (!priceId) {
    return NextResponse.json({ error: `معرّف السعر لخطة ${plan} غير مُعرَّف` }, { status: 503 });
  }

  const { data: settings } = await supabase
    .from("org_settings")
    .select("stripe_customer_id")
    .eq("org_id", orgId)
    .maybeSingle();

  const appUrl = await getAppUrl();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: settings?.stripe_customer_id || undefined,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/?subscribed=success`,
    cancel_url: `${appUrl}/?subscribed=cancelled`,
    client_reference_id: orgId,
    metadata: { org_id: orgId, plan },
    subscription_data: { metadata: { org_id: orgId, plan } },
  });

  if (!session.url) {
    return NextResponse.json({ error: "تعذّر إنشاء جلسة الاشتراك" }, { status: 500 });
  }

  return NextResponse.json({ url: session.url });
}
