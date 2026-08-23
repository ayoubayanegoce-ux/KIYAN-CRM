import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createQualifiedLead } from "@/lib/leadIntake";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ORG_ID_PATTERN = /^org_[a-zA-Z0-9]+$/;
const MAX_FIELD_LENGTH = 200;
const MAX_NOTES_LENGTH = 1000;

/**
 * Public, unauthenticated intake endpoint for the embeddable lead-capture
 * form (app/forms/[orgId]). Unlike the secret-protected webhook, anyone who
 * has the org's share link/embed code can submit here by design — that's
 * the nature of a public contact form. The `orgId` itself is the only
 * "credential" and is inherently visible to whoever embeds the form, so
 * this route intentionally never echoes back AI scoring details.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  if (!orgId || !ORG_ID_PATTERN.test(orgId)) {
    return NextResponse.json({ error: "منظمة غير صالحة" }, { status: 400 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }

  if (typeof payload !== "object" || payload === null) {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }

  const body = payload as Record<string, unknown>;

  // حقل مصيدة (honeypot) مخفي عن الزوار الحقيقيين — امتلاؤه يعني على الأغلب بوتاً
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ success: true }, { status: 201 });
  }

  const name = typeof body.name === "string" ? body.name.trim().slice(0, MAX_FIELD_LENGTH) : "";
  const email = typeof body.email === "string" ? body.email.trim().slice(0, MAX_FIELD_LENGTH) : "";
  const company = typeof body.company === "string" ? body.company.trim().slice(0, MAX_FIELD_LENGTH) : "";
  const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, MAX_NOTES_LENGTH) : "";

  if (!name || !email) {
    return NextResponse.json({ error: "الاسم والبريد الإلكتروني مطلوبان" }, { status: 400 });
  }
  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: "بريد إلكتروني غير صالح" }, { status: 400 });
  }

  try {
    await createQualifiedLead(orgId, { name, email, company, notes }, "public_form");
    revalidatePath("/");
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Public form lead insert error:", error);
    return NextResponse.json({ error: "تعذر إرسال البيانات، حاول لاحقاً" }, { status: 500 });
  }
}
