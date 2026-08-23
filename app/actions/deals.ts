"use server";

import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";
import { getStripeClient } from "@/lib/stripe";
import { getAppUrl } from "@/lib/appUrl";
import { revalidatePath } from "next/cache";

export type DealStage =
  | "discovery"
  | "meeting_scheduled"
  | "proposal"
  | "negotiation"
  | "won"
  | "lost";

export type PaymentStatus = "unpaid" | "pending" | "paid" | "failed";

export type DealRow = {
  id: string;
  org_id: string;
  lead_id: string | null;
  title: string;
  deal_value: number;
  win_probability: number | null;
  stage: DealStage;
  payment_status: PaymentStatus;
  stripe_checkout_url: string | null;
  stripe_checkout_session_id: string | null;
  created_at: string;
  leads?: {
    name: string;
    company: string | null;
    email: string;
    assignee_id?: string | null;
    assignee_name?: string | null;
  } | null;
};

const DEFAULT_WIN_PROBABILITY = 50;

function clampProbability(raw: FormDataEntryValue | null): number {
  const num = Number(raw);
  if (!Number.isFinite(num)) return DEFAULT_WIN_PROBABILITY;
  return Math.min(100, Math.max(0, Math.round(num)));
}

const DEAL_STAGES: DealStage[] = [
  "discovery",
  "meeting_scheduled",
  "proposal",
  "negotiation",
  "won",
  "lost",
];

export async function getDeals() {
  const { orgId } = await auth();
  if (!orgId) return [];

  const { data, error } = await supabase
    .from("deals")
    .select("*, leads(name, email, company, assignee_id, assignee_name)")
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
  const dealValue = Number(formData.get("deal_value")) || 0;
  const winProbability = clampProbability(formData.get("win_probability"));

  if (!title) throw new Error("عنوان الصفقة مطلوب");

  const { data, error } = await supabase
    .from("deals")
    .insert([
      {
        org_id: orgId,
        lead_id: leadId,
        title,
        deal_value: dealValue,
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
    metadata: { deal_value: dealValue, win_probability: winProbability },
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
        deal_value: 0,
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

/**
 * ينشئ رابط دفع Stripe Checkout (Session-hosted، بدون Stripe.js على العميل)
 * لصفقة موجودة، ويحفظ معرّف الجلسة والرابط على الصفقة بحالة "pending" —
 * التأكيد الفعلي للدفع (تحويل الحالة إلى "paid") يتم حصراً عبر الويب هوك
 * (app/api/webhooks/stripe)، وليس من هذا الإجراء ولا من صفحة النجاح.
 */
export async function createDealCheckoutSession(dealId: string): Promise<{ url: string }> {
  const { orgId } = await auth();
  if (!orgId) throw new Error("يجب اختيار منظمة أولاً");

  const stripe = getStripeClient();
  if (!stripe) throw new Error("Stripe غير مُهيَّأ: أضف STRIPE_SECRET_KEY في .env.local");

  const { data: deal, error } = await supabase
    .from("deals")
    .select("id, title, deal_value, leads(email, name)")
    .eq("id", dealId)
    .eq("org_id", orgId)
    .single();

  if (error || !deal) throw new Error("الصفقة غير موجودة");
  if (!deal.deal_value || Number(deal.deal_value) <= 0) {
    throw new Error("قيمة الصفقة يجب أن تكون أكبر من صفر لإنشاء رابط دفع");
  }

  const appUrl = await getAppUrl();
  const lead = Array.isArray(deal.leads) ? deal.leads[0] : deal.leads;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "eur",
          unit_amount: Math.round(Number(deal.deal_value) * 100),
          product_data: { name: deal.title },
        },
        quantity: 1,
      },
    ],
    customer_email: lead?.email || undefined,
    success_url: `${appUrl}/?payment=success`,
    cancel_url: `${appUrl}/?payment=cancelled`,
    metadata: { deal_id: dealId, org_id: orgId },
  });

  if (!session.url) throw new Error("تعذّر إنشاء رابط الدفع");

  const { error: updateError } = await supabase
    .from("deals")
    .update({
      stripe_checkout_session_id: session.id,
      stripe_checkout_url: session.url,
      payment_status: "pending",
    })
    .eq("id", dealId)
    .eq("org_id", orgId);

  if (updateError) throw new Error(updateError.message);

  await logActivity({
    orgId,
    dealId,
    type: "payment_link_created",
    description: `💳 تم إنشاء رابط دفع Stripe للصفقة "${deal.title}"`,
    metadata: { stripe_session_id: session.id, amount: deal.deal_value },
  });

  revalidatePath("/");
  return { url: session.url };
}
