import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getStripeClient } from "@/lib/stripe";
import { getAppUrl } from "@/lib/appUrl";
import { supabase } from "@/lib/supabase";
import { priceIdForPlan, planFromPriceId, isPlanKey, type PlanKey } from "@/lib/plans";

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

  let body: { plan?: string; priceId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  // يقبل plan (يُحوَّل لمعرّف سعر عبر priceIdForPlan، مع fallback ثابت دائماً
  // متاح) أو priceId مباشرة — أياً كان المصدر، planFromPriceId يستخدم نفس
  // جدول priceIdForPlan فيبقى الويب هوك قادراً على التعرّف على الخطة لاحقاً.
  let priceId = body.priceId?.trim();
  let plan: Exclude<PlanKey, "free"> | undefined = body.plan && isPlanKey(body.plan) ? body.plan : undefined;

  if (!priceId && plan) {
    priceId = priceIdForPlan(plan);
  } else if (priceId && !plan) {
    const resolved = planFromPriceId(priceId);
    if (resolved !== "free") plan = resolved;
  }

  if (!priceId) {
    return NextResponse.json({ error: "يجب تحديد plan صالح (starter/pro/enterprise) أو priceId" }, { status: 400 });
  }

  const { data: settings } = await supabase
    .from("org_settings")
    .select("stripe_customer_id")
    .eq("org_id", orgId)
    .maybeSingle();

  const appUrl = await getAppUrl();
  const planMetadata = plan ?? "custom";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: settings?.stripe_customer_id || undefined,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/?subscribed=success`,
    cancel_url: `${appUrl}/?subscribed=cancelled`,
    client_reference_id: orgId,
    metadata: { org_id: orgId, plan: planMetadata },
    subscription_data: { metadata: { org_id: orgId, plan: planMetadata } },
  });

  if (!session.url) {
    return NextResponse.json({ error: "تعذّر إنشاء جلسة الاشتراك" }, { status: 500 });
  }

  return NextResponse.json({ url: session.url });
}
