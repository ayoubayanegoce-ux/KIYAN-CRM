import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { PLAN_QUOTAS } from "@/lib/plans";

/**
 * يُستدعى يومياً عبر Vercel Cron (راجع vercel.json). YouCanPay لا يدعم
 * تجديداً تلقائياً كما في Stripe Subscriptions — العميل يدفع يدوياً كل شهر،
 * وهذا المسار هو ما يُرجع المنظمات منتهية الصلاحية إلى خطة Free.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: expired, error } = await supabase
    .from("org_settings")
    .select("org_id")
    .lt("plan_expires_at", new Date().toISOString())
    .neq("plan", "free");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  for (const row of expired ?? []) {
    await supabase
      .from("org_settings")
      .update({ plan: "free", subscription_status: "expired", ai_monthly_quota: PLAN_QUOTAS.free })
      .eq("org_id", row.org_id);
  }

  return NextResponse.json({ downgraded: expired?.length ?? 0 });
}
