"use server";

import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";
import { revalidatePath } from "next/cache";

export type DealStage = "discovery" | "proposal" | "negotiation" | "won" | "lost";

export type DealRow = {
  id: string;
  org_id: string;
  lead_id: string | null;
  title: string;
  value: number;
  win_probability: number | null;
  stage: DealStage;
  created_at: string;
  leads?: { name: string; company: string | null; email: string } | null;
};

const DEFAULT_WIN_PROBABILITY = 50;

function clampProbability(raw: FormDataEntryValue | null): number {
  const num = Number(raw);
  if (!Number.isFinite(num)) return DEFAULT_WIN_PROBABILITY;
  return Math.min(100, Math.max(0, Math.round(num)));
}

const DEAL_STAGES: DealStage[] = ["discovery", "proposal", "negotiation", "won", "lost"];

export async function getDeals() {
  const { orgId } = await auth();
  if (!orgId) return [];

  const { data, error } = await supabase
    .from("deals")
    .select("*, leads(name, email, company)")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching deals:", error);
    return [];
  }
  return data;
}

export async function createDeal(formData: FormData) {
  const { orgId } = await auth();
  if (!orgId) throw new Error("يجب اختيار منظمة أولاً");

  const title = (formData.get("title") as string)?.trim();
  const leadId = (formData.get("lead_id") as string) || null;
  const value = Number(formData.get("value")) || 0;
  const winProbability = clampProbability(formData.get("win_probability"));

  if (!title) throw new Error("عنوان الصفقة مطلوب");

  const { data, error } = await supabase
    .from("deals")
    .insert([
      {
        org_id: orgId,
        lead_id: leadId,
        title,
        value,
        win_probability: winProbability,
        stage: "discovery",
      },
    ])
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  await logActivity({
    orgId,
    leadId,
    dealId: data.id,
    type: "deal_created",
    description: `تم إنشاء صفقة جديدة: ${title}`,
    metadata: { value, win_probability: winProbability },
  });

  revalidatePath("/");
}

export async function updateDealStage(dealId: string, stage: DealStage) {
  const { orgId } = await auth();
  if (!orgId) throw new Error("يجب اختيار منظمة أولاً");

  if (!DEAL_STAGES.includes(stage)) throw new Error("مرحلة غير صالحة");

  const { data: existing, error: fetchError } = await supabase
    .from("deals")
    .select("stage, lead_id, title")
    .eq("id", dealId)
    .eq("org_id", orgId)
    .single();

  if (fetchError || !existing) throw new Error("الصفقة غير موجودة");

  const { error } = await supabase
    .from("deals")
    .update({ stage })
    .eq("id", dealId)
    .eq("org_id", orgId);

  if (error) throw new Error(error.message);

  await logActivity({
    orgId,
    leadId: existing.lead_id,
    dealId,
    type: "deal_stage_changed",
    description: `تغيّرت مرحلة الصفقة "${existing.title}" من ${existing.stage} إلى ${stage}`,
    metadata: { from: existing.stage, to: stage },
  });

  revalidatePath("/");
}

export async function convertLeadToDeal(leadId: string) {
  const { orgId } = await auth();
  if (!orgId) throw new Error("يجب اختيار منظمة أولاً");

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .eq("org_id", orgId)
    .single();

  if (leadError || !lead) throw new Error("العميل غير موجود");

  const { data: deal, error: dealError } = await supabase
    .from("deals")
    .insert([
      {
        org_id: orgId,
        lead_id: lead.id,
        title: `${lead.company || lead.name} - Opportunité`,
        value: 0,
        win_probability: DEFAULT_WIN_PROBABILITY,
        stage: "discovery",
      },
    ])
    .select("id")
    .single();

  if (dealError) throw new Error(dealError.message);

  const { error: leadUpdateError } = await supabase
    .from("leads")
    .update({ status: "converted" })
    .eq("id", leadId)
    .eq("org_id", orgId);

  if (leadUpdateError) throw new Error(leadUpdateError.message);

  await logActivity({
    orgId,
    leadId,
    dealId: deal.id,
    type: "lead_converted",
    description: `تم تحويل العميل "${lead.name}" إلى صفقة`,
  });

  revalidatePath("/");
}
