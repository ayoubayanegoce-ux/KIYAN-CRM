import { supabase } from "@/lib/supabase";
import { qualifyLead, enrichCompanyProfile } from "@/lib/ai";
import { getCrmContext } from "@/lib/crmContext";
import { logActivity } from "@/lib/activity";
import { maybeRunAutoPilot } from "@/lib/autopilot";
import { notifyHotLead } from "@/lib/whatsapp";

export type LeadIntakeSource = "webhook" | "public_form";

export type LeadIntakeInput = {
  name: string;
  email: string;
  company: string;
  /** احتياجات/رسالة العميل من نموذج الاستقبال العام — تُحفظ كملاحظة أولى إن وُجدت */
  notes?: string;
};

export type LeadIntakeResult = {
  id: string;
  ai_score: number;
  ai_intent: string;
};

const SOURCE_LABELS: Record<LeadIntakeSource, string> = {
  webhook: "Webhook",
  public_form: "نموذج استقبال عام",
};

/**
 * Shared by the secret-protected webhook and the public embeddable form —
 * both are unauthenticated (no Clerk session) automated intake paths that
 * need the exact same qualify → insert → log → notify → auto-pilot sequence.
 */
export async function createQualifiedLead(
  orgId: string,
  input: LeadIntakeInput,
  source: LeadIntakeSource
): Promise<LeadIntakeResult> {
  const context = await getCrmContext();
  const [{ ai_score, ai_intent, reasoning }, enrichedData] = await Promise.all([
    qualifyLead(input.name, input.email, input.company, context),
    input.company.trim() ? enrichCompanyProfile(input.company) : Promise.resolve(null),
  ]);

  const { data, error } = await supabase
    .from("leads")
    .insert([
      {
        org_id: orgId,
        name: input.name,
        email: input.email,
        company: input.company,
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
    description: `تم استقبال عميل جديد (${SOURCE_LABELS[source]}): ${input.name}`,
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

  const trimmedNotes = input.notes?.trim();
  if (trimmedNotes) {
    const { error: noteError } = await supabase.from("notes").insert([
      { org_id: orgId, lead_id: data.id, type: "note", content: trimmedNotes },
    ]);
    if (!noteError) {
      await logActivity({
        orgId,
        leadId: data.id,
        type: "note_added",
        description: `📝 احتياجات العميل من النموذج العام: ${trimmedNotes.slice(0, 80)}`,
      });
    }
  }

  if (ai_intent === "hot") {
    await notifyHotLead({
      name: input.name,
      email: input.email,
      company: input.company || null,
      ai_score,
      ai_intent,
      reasoning,
    });
  }

  await maybeRunAutoPilot(orgId, {
    id: data.id,
    name: input.name,
    email: input.email,
    company: input.company,
    ai_score,
    ai_intent,
    enrichedData,
  });

  return { id: data.id, ai_score, ai_intent };
}
