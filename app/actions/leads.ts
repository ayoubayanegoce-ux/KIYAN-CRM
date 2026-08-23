"use server";

import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { qualifyLeadWithContext } from "@/app/actions/qualification";
import { enrichCompanyProfile } from "@/lib/ai";
import { parseCsv } from "@/lib/csv";
import { logActivity } from "@/lib/activity";
import { maybeRunAutoPilot } from "@/lib/autopilot";
import { notifyHotLead } from "@/lib/whatsapp";
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

  // تشغيل وكيل التقييم وإثراء بيانات الشركة معاً (متوازيان — تحليلان مستقلان لا يعتمد أحدهما على الآخر)
  const [{ ai_score, ai_intent, reasoning }, enrichedData] = await Promise.all([
    qualifyLeadWithContext(name, email, company, orgId),
    company.trim() ? enrichCompanyProfile(company) : Promise.resolve(null),
  ]);

  const { data, error } = await supabase
    .from("leads")
    .insert([
      {
        org_id: orgId,
        name,
        email,
        company,
        status: "new",
        ai_score,
        ai_intent,
        enriched_data: enrichedData,
      },
    ])
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  await logActivity({
    orgId,
    leadId: data.id,
    type: "lead_created",
    description: `تم إنشاء عميل جديد: ${name}`,
  });
  await logActivity({
    orgId,
    leadId: data.id,
    type: "ai_qualified",
    description: `تقييم الذكاء الاصطناعي: ${ai_score}/100 (${ai_intent})`,
    metadata: { ai_score, ai_intent, reasoning },
  });

  if (enrichedData?.industry || enrichedData?.companyModel) {
    await logActivity({
      orgId,
      leadId: data.id,
      type: "company_enriched",
      description: `🏢 إثراء بيانات الشركة: ${enrichedData.industry || "قطاع غير محدد"} (${
        enrichedData.companyModel || "نموذج غير معروف"
      })`,
      metadata: enrichedData,
    });
  }

  if (ai_intent === "hot") {
    await notifyHotLead({ name, email, company: company || null, ai_score, ai_intent, reasoning });
  }

  await maybeRunAutoPilot(orgId, {
    id: data.id,
    name,
    email,
    company,
    ai_score,
    ai_intent,
    enrichedData,
  });

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
      const [{ ai_score, ai_intent, reasoning }, enrichedData] = await Promise.all([
        qualifyLeadWithContext(lead.name, lead.email, lead.company, orgId),
        lead.company ? enrichCompanyProfile(lead.company) : Promise.resolve(null),
      ]);
      return { ...lead, ai_score, ai_intent, reasoning, enrichedData };
    })
  );

  if (qualified.length > 0) {
    const { data: inserted, error } = await supabase
      .from("leads")
      .insert(
        qualified.map((lead) => ({
          org_id: orgId,
          name: lead.name,
          email: lead.email,
          company: lead.company,
          status: "new",
          ai_score: lead.ai_score,
          ai_intent: lead.ai_intent,
          enriched_data: lead.enrichedData,
        }))
      )
      .select("id");
    if (error) throw new Error(error.message);

    for (let i = 0; i < qualified.length; i++) {
      const lead = qualified[i];
      const leadId = inserted?.[i]?.id;
      if (!leadId) continue;

      await logActivity({
        orgId,
        leadId,
        type: "lead_created",
        description: `تم استيراد عميل عبر CSV: ${lead.name}`,
      });
      await logActivity({
        orgId,
        leadId,
        type: "ai_qualified",
        description: `تقييم الذكاء الاصطناعي: ${lead.ai_score}/100 (${lead.ai_intent})`,
        metadata: { ai_score: lead.ai_score, ai_intent: lead.ai_intent, reasoning: lead.reasoning },
      });

      if (lead.enrichedData?.industry || lead.enrichedData?.companyModel) {
        await logActivity({
          orgId,
          leadId,
          type: "company_enriched",
          description: `🏢 إثراء بيانات الشركة: ${lead.enrichedData.industry || "قطاع غير محدد"} (${
            lead.enrichedData.companyModel || "نموذج غير معروف"
          })`,
          metadata: lead.enrichedData,
        });
      }

      if (lead.ai_intent === "hot") {
        await notifyHotLead({
          name: lead.name,
          email: lead.email,
          company: lead.company || null,
          ai_score: lead.ai_score,
          ai_intent: lead.ai_intent,
          reasoning: lead.reasoning,
        });
      }

      await maybeRunAutoPilot(orgId, {
        id: leadId,
        name: lead.name,
        email: lead.email,
        company: lead.company,
        ai_score: lead.ai_score,
        ai_intent: lead.ai_intent,
        enrichedData: lead.enrichedData,
      });
    }
  }

  revalidatePath("/");
  return { imported: qualified.length, skipped };
}

/**
 * assigneeId فارغ/null يعني "إلغاء التعيين" (عودة لحالة غير معيّن). assigneeName
 * يُمرَّر من العميل من نفس قائمة الأعضاء المعروضة في القائمة المنسدلة، فلا حاجة
 * لاستدعاء Clerk API عند كل تعيين.
 */
export async function assignLead(leadId: string, assigneeId: string | null, assigneeName: string | null) {
  const { orgId } = await auth();
  if (!orgId) throw new Error("يجب اختيار منظمة أولاً");

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("name")
    .eq("id", leadId)
    .eq("org_id", orgId)
    .single();

  if (leadError || !lead) throw new Error("العميل غير موجود");

  const { error } = await supabase
    .from("leads")
    .update({ assignee_id: assigneeId, assignee_name: assigneeName })
    .eq("id", leadId)
    .eq("org_id", orgId);

  if (error) throw new Error(error.message);

  await logActivity({
    orgId,
    leadId,
    type: "lead_assigned",
    description: assigneeName
      ? `👤 تم تعيين العميل "${lead.name}" إلى ${assigneeName}`
      : `تم إلغاء تعيين العميل "${lead.name}"`,
    metadata: { assignee_id: assigneeId, assignee_name: assigneeName },
  });

  revalidatePath("/");
}
