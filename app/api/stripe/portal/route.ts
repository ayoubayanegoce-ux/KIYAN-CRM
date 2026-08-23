import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getStripeClient } from "@/lib/stripe";
import { getAppUrl } from "@/lib/appUrl";
import { supabase } from "@/lib/supabase";

/** يفتح Stripe Customer Portal لإدارة بطاقة الدفع والفواتير وإلغاء/تغيير الخطة. */
export async function POST() {
  const { orgId } = await auth();
  if (!orgId) return NextResponse.json({ error: "يجب اختيار منظمة أولاً" }, { status: 401 });

  const stripe = getStripeClient();
  if (!stripe) return NextResponse.json({ error: "Stripe غير مُهيَّأ" }, { status: 503 });

  const { data: settings } = await supabase
    .from("org_settings")
    .select("stripe_customer_id")
    .eq("org_id", orgId)
    .maybeSingle();

  if (!settings?.stripe_customer_id) {
    return NextResponse.json({ error: "لا يوجد اشتراك فعّال لهذه المنظمة بعد" }, { status: 400 });
  }

  const appUrl = await getAppUrl();
  const session = await stripe.billingPortal.sessions.create({
    customer: settings.stripe_customer_id,
    return_url: `${appUrl}/`,
  });

  return NextResponse.json({ url: session.url });
}
