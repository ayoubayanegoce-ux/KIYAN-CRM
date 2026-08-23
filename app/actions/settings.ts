"use server";

import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import type { AITone, AILanguage } from "@/lib/ai";
import { getTwilioConfigStatus, sendTestWhatsAppAlert, type TwilioConfigStatus } from "@/lib/whatsapp";

export type { TwilioConfigStatus };

export async function checkTwilioStatus(): Promise<TwilioConfigStatus> {
  const { orgId } = await auth();
  if (!orgId) return { configured: false, missing: [] };
  return getTwilioConfigStatus();
}

export async function sendTestWhatsApp(): Promise<{ success: boolean; message: string }> {
  const { orgId } = await auth();
  if (!orgId) throw new Error("يجب اختيار منظمة أولاً");
  return sendTestWhatsAppAlert();
}

export type { AITone, AILanguage };

export type AISettings = {
  tone: AITone;
  language: AILanguage;
  valueProposition: string;
  bookingUrl: string;
};

const DEFAULT_AI_SETTINGS: AISettings = {
  tone: "professionnel",
  language: "fr",
  valueProposition: "",
  bookingUrl: "",
};

export async function getAISettings(): Promise<AISettings> {
  const { orgId } = await auth();
  if (!orgId) return DEFAULT_AI_SETTINGS;

  const { data, error } = await supabase
    .from("org_settings")
    .select("ai_tone, ai_language, ai_value_proposition, booking_url")
    .eq("org_id", orgId)
    .maybeSingle();

  if (error || !data) return DEFAULT_AI_SETTINGS;

  return {
    tone: (data.ai_tone as AITone) ?? DEFAULT_AI_SETTINGS.tone,
    language: (data.ai_language as AILanguage) ?? DEFAULT_AI_SETTINGS.language,
    valueProposition: data.ai_value_proposition ?? "",
    bookingUrl: data.booking_url ?? "",
  };
}

export async function setAISettings(settings: AISettings) {
  const { orgId } = await auth();
  if (!orgId) throw new Error("يجب اختيار منظمة أولاً");

  const { error } = await supabase.from("org_settings").upsert(
    {
      org_id: orgId,
      ai_tone: settings.tone,
      ai_language: settings.language,
      ai_value_proposition: settings.valueProposition,
      booking_url: settings.bookingUrl.trim() || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "org_id" }
  );

  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function getAutopilotSetting(): Promise<boolean> {
  const { orgId } = await auth();
  if (!orgId) return false;

  const { data, error } = await supabase
    .from("org_settings")
    .select("autopilot_enabled")
    .eq("org_id", orgId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching org settings:", error);
    return false;
  }
  return data?.autopilot_enabled ?? false;
}

export async function setAutopilotSetting(enabled: boolean) {
  const { orgId } = await auth();
  if (!orgId) throw new Error("يجب اختيار منظمة أولاً");

  const { error } = await supabase
    .from("org_settings")
    .upsert(
      { org_id: orgId, autopilot_enabled: enabled, updated_at: new Date().toISOString() },
      { onConflict: "org_id" }
    );

  if (error) throw new Error(error.message);
  revalidatePath("/");
}
