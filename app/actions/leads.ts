"use server";

import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { qualifyLead } from "@/lib/ai";
import { parseCsv } from "@/lib/csv";
import { revalidatePath } from "next/cache";

export type ImportSkip = { row: number; reason: string };
export type ImportResult = { imported: number; skipped: ImportSkip[] };

const MAX_IMPORT_ROWS = 25;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function getLeads() {
  const { orgId } = await auth();
  if (!orgId) return [];

  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching leads:", error);
    return [];
  }
  return data;
}

export async function addLead(formData: FormData) {
  const { orgId } = await auth();
  if (!orgId) throw new Error("يجب اختيار منظمة أولاً");

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const company = formData.get("company") as string;

  // تشغيل وكيل الذكاء الاصطناعي لتقييم العميل فورياً
  const { ai_score, ai_intent } = await qualifyLead(name, email, company);

  const { error } = await supabase.from("leads").insert([
    {
      org_id: orgId,
      name,
      email,
      company,
      status: "new",
      ai_score,
      ai_intent,
    },
  ]);

  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function importLeadsFromCsv(csvText: string): Promise<ImportResult> {
  const { orgId } = await auth();
  if (!orgId) throw new Error("يجب اختيار منظمة أولاً");

  const rows = parseCsv(csvText);
  if (rows.length === 0) throw new Error("ملف CSV فارغ أو غير صالح");
  if (rows.length > MAX_IMPORT_ROWS) {
    throw new Error(`الحد الأقصى ${MAX_IMPORT_ROWS} عميل لكل عملية استيراد. الملف يحتوي على ${rows.length} صف.`);
  }

  const skipped: ImportSkip[] = [];
  const valid: { name: string; email: string; company: string }[] = [];

  rows.forEach((r, idx) => {
    const name = (r["name"] || r["الاسم"] || "").trim();
    const email = (r["email"] || r["البريد الإلكتروني"] || "").trim();
    const company = (r["company"] || r["الشركة"] || "").trim();
    const rowNumber = idx + 2;

    if (!name || !email) {
      skipped.push({ row: rowNumber, reason: "الاسم أو البريد الإلكتروني مفقود" });
      return;
    }
    if (!EMAIL_PATTERN.test(email)) {
      skipped.push({ row: rowNumber, reason: "بريد إلكتروني غير صالح" });
      return;
    }
    valid.push({ name, email, company });
  });

  const qualified = await Promise.all(
    valid.map(async (lead) => {
      const { ai_score, ai_intent } = await qualifyLead(lead.name, lead.email, lead.company);
      return { ...lead, ai_score, ai_intent };
    })
  );

  if (qualified.length > 0) {
    const { error } = await supabase.from("leads").insert(
      qualified.map((lead) => ({
        org_id: orgId,
        name: lead.name,
        email: lead.email,
        company: lead.company,
        status: "new",
        ai_score: lead.ai_score,
        ai_intent: lead.ai_intent,
      }))
    );
    if (error) throw new Error(error.message);
  }

  revalidatePath("/");
  return { imported: qualified.length, skipped };
}