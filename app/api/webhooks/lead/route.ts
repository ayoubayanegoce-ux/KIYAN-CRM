import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createQualifiedLead } from "@/lib/leadIntake";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_FIELD_LENGTH = 200;

function isAuthorized(request: NextRequest, secret: string): boolean {
  const provided = request.headers.get("x-webhook-secret") || "";

  const expectedBuf = Buffer.from(secret);
  const providedBuf = Buffer.from(provided);

  if (expectedBuf.length !== providedBuf.length) return false;
  return timingSafeEqual(expectedBuf, providedBuf);
}

export async function POST(request: NextRequest) {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) {
    console.error("WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  if (!isAuthorized(request, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = process.env.WEBHOOK_DEFAULT_ORG_ID;
  if (!orgId) {
    console.error("WEBHOOK_DEFAULT_ORG_ID is not configured");
    return NextResponse.json({ error: "Default organization not configured" }, { status: 503 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof payload !== "object" || payload === null) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const body = payload as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim().slice(0, MAX_FIELD_LENGTH) : "";
  const email = typeof body.email === "string" ? body.email.trim().slice(0, MAX_FIELD_LENGTH) : "";
  const company =
    typeof body.company === "string" ? body.company.trim().slice(0, MAX_FIELD_LENGTH) : "";

  if (!name || !email) {
    return NextResponse.json({ error: "الحقلان name و email مطلوبان" }, { status: 400 });
  }
  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: "بريد إلكتروني غير صالح" }, { status: 400 });
  }

  try {
    const result = await createQualifiedLead(orgId, { name, email, company }, "webhook");
    revalidatePath("/");
    return NextResponse.json(
      { success: true, lead_id: result.id, ai_score: result.ai_score, ai_intent: result.ai_intent },
      { status: 201 }
    );
  } catch (error) {
    console.error("Webhook lead insert error:", error);
    return NextResponse.json({ error: "تعذر حفظ العميل" }, { status: 500 });
  }
}
