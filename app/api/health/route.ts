import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getYouCanPayConfig } from "@/lib/youcanpay";

export const dynamic = "force-dynamic";

type CheckStatus = "ok" | "error" | "not_configured";
type Check = { status: CheckStatus; detail?: string };

/** استعلام خفيف بحد limit(1) — الهدف التحقق من الاتصال فقط، وليس قراءة بيانات فعلية. */
async function checkDatabase(): Promise<Check> {
  try {
    const { error } = await supabase.from("org_settings").select("org_id").limit(1);
    if (error) return { status: "error", detail: error.message };
    return { status: "ok" };
  } catch (e) {
    return { status: "error", detail: e instanceof Error ? e.message : "تعذّر الاتصال بقاعدة البيانات" };
  }
}

function checkAI(): Check {
  return { status: process.env.GEMINI_API_KEY ? "ok" : "not_configured" };
}

function checkPayments(): Check & { sandbox?: boolean } {
  const config = getYouCanPayConfig();
  if (!config) return { status: "not_configured" };
  return { status: "ok", sandbox: config.sandbox };
}

function checkEmail(): Check {
  return { status: process.env.RESEND_API_KEY ? "ok" : "not_configured" };
}

function checkAuth(): Check {
  const configured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
  return { status: configured ? "ok" : "not_configured" };
}

/**
 * نقطة فحص حالة النظام — لا تكشف أي أسرار، فقط حالة كل تكامل (ok/error/not_configured).
 * لا Clerk auth() عمداً: يُستخدَم من أدوات مراقبة خارجية (uptime checks) لا تملك جلسة.
 */
export async function GET() {
  const [database] = await Promise.all([checkDatabase()]);
  const checks = {
    database,
    ai: checkAI(),
    payments: checkPayments(),
    email: checkEmail(),
    auth: checkAuth(),
  };

  const hasError = Object.values(checks).some((c) => c.status === "error");

  return NextResponse.json(
    { status: hasError ? "error" : "ok", timestamp: new Date().toISOString(), checks },
    { status: hasError ? 503 : 200 }
  );
}
