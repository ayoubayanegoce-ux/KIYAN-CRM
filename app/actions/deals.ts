"use server";

import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export type DealStage = "discovery" | "proposal" | "negotiation" | "won" | "lost";

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

  if (!title) throw new Error("عنوان الصفقة مطلوب");

  const { error } = await supabase.from("deals").insert([
    {
      org_id: orgId,
      lead_id: leadId,
      title,
      value,
      stage: "discovery",
    },
  ]);

  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function updateDealStage(dealId: string, stage: DealStage) {
  const { orgId } = await auth();
  if (!orgId) throw new Error("يجب اختيار منظمة أولاً");

  if (!DEAL_STAGES.includes(stage)) throw new Error("مرحلة غير صالحة");

  const { error } = await supabase
    .from("deals")
    .update({ stage })
    .eq("id", dealId)
    .eq("org_id", orgId);

  if (error) throw new Error(error.message);
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

  const { error: dealError } = await supabase.from("deals").insert([
    {
      org_id: orgId,
      lead_id: lead.id,
      title: `${lead.company || lead.name} - Opportunité`,
      value: 0,
      stage: "discovery",
    },
  ]);

  if (dealError) throw new Error(dealError.message);

  const { error: leadUpdateError } = await supabase
    .from("leads")
    .update({ status: "converted" })
    .eq("id", leadId)
    .eq("org_id", orgId);

  if (leadUpdateError) throw new Error(leadUpdateError.message);

  revalidatePath("/");
}
