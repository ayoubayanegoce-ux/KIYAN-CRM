"use server";

import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import type { AITone, AILanguage } from "@/lib/ai";
import { sendTelegramMessage } from "@/lib/telegram";
import { PLAN_QUOTAS, type PlanKey } from "@/lib/plans";

export type TelegramSettings = {
  enabled: boolean;
  botToken: string;
  chatId: string;
};

const DEFAULT_TELEGRAM_SETTINGS: TelegramSettings = { enabled: false, botToken: "", chatId: "" };

export async function getTelegramSettings(): Promise<TelegramSettings> {
  const { orgId } = await auth();
  if (!orgId) return DEFAULT_TELEGRAM_SETTINGS;

  const { data, error } = await supabase
    .from("org_settings")
    .select("telegram_enabled, telegram_bot_token, telegram_chat_id")
    .eq("org_id", orgId)
    .maybeSingle();

  if (error || !data) return DEFAULT_TELEGRAM_SETTINGS;

  return {
    enabled: data.telegram_enabled ?? false,
    botToken: data.telegram_bot_token ?? "",
    chatId: data.telegram_chat_id ?? "",
  };
}

export async function setTelegramSettings(settings: TelegramSettings) {
  const { orgId } = await auth();
  if (!orgId) throw new Error("يجب اختيار منظمة أولاً");

  const { error } = await supabase.from("org_settings").upsert(
    {
      org_id: orgId,
      telegram_enabled: settings.enabled,
      telegram_bot_token: settings.botToken.trim() || null,
      telegram_chat_id: settings.chatId.trim() || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "org_id" }
  );

  if (error) throw new Error(error.message);
  revalidatePath("/");
}

/** يرمي رسالة خطأ حقيقية عند الفشل — زر اختبار يدوي، المستخدم يحتاج معرفة السبب الفعلي. */
export async function sendTestTelegram(): Promise<{ success: boolean; message: string }> {
  const { orgId } = await auth();
  if (!orgId) throw new Error("يجب اختيار منظمة أولاً");

  const settings = await getTelegramSettings();
  if (!settings.botToken.trim() || !settings.chatId.trim()) {
    return { success: false, message: "الرجاء إدخال Bot Token و Chat ID أولاً" };
  }

  try {
    await sendTelegramMessage(
      settings.botToken.trim(),
      settings.chatId.trim(),
      "✅ رسالة اختبار من KIYAN CRM — إشعارات Telegram تعمل بشكل صحيح."
    );
    return { success: true, message: "تم إرسال رسالة الاختبار بنجاح." };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "خطأ غير معروف";
    return { success: false, message: `فشل الإرسال: ${detail}` };
  }
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

/** true = تعذّر التحقق أو لا توجد منظمة → لا نُظهر معالج الإعداد افتراضياً (فشل آمن، لا يحجب الواجهة). */
export async function getOnboardingStatus(): Promise<boolean> {
  const { orgId } = await auth();
  if (!orgId) return true;

  const { data, error } = await supabase
    .from("org_settings")
    .select("onboarding_completed")
    .eq("org_id", orgId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching onboarding status:", error);
    return true;
  }
  return data?.onboarding_completed ?? false;
}

export type OnboardingInput = {
  orgDisplayName: string;
  valueProposition: string;
  icp: string;
  bookingUrl: string;
  tone: AITone;
  language: AILanguage;
};

export async function completeOnboarding(input: OnboardingInput) {
  const { orgId } = await auth();
  if (!orgId) throw new Error("يجب اختيار منظمة أولاً");

  const { error } = await supabase.from("org_settings").upsert(
    {
      org_id: orgId,
      org_display_name: input.orgDisplayName.trim() || null,
      ai_value_proposition: input.valueProposition.trim(),
      icp: input.icp.trim() || null,
      booking_url: input.bookingUrl.trim() || null,
      ai_tone: input.tone,
      ai_language: input.language,
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "org_id" }
  );

  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export type BrandingSettings = {
  orgDisplayName: string;
  logoUrl: string;
  brandColor: string;
};

const DEFAULT_BRANDING: BrandingSettings = { orgDisplayName: "", logoUrl: "", brandColor: "" };

export async function getBranding(): Promise<BrandingSettings> {
  const { orgId } = await auth();
  if (!orgId) return DEFAULT_BRANDING;

  const { data, error } = await supabase
    .from("org_settings")
    .select("org_display_name, logo_url, brand_color")
    .eq("org_id", orgId)
    .maybeSingle();

  if (error || !data) return DEFAULT_BRANDING;

  return {
    orgDisplayName: data.org_display_name ?? "",
    logoUrl: data.logo_url ?? "",
    brandColor: data.brand_color ?? "",
  };
}

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

export async function setBranding(settings: BrandingSettings) {
  const { orgId } = await auth();
  if (!orgId) throw new Error("يجب اختيار منظمة أولاً");

  const brandColor = settings.brandColor.trim();
  if (brandColor && !HEX_COLOR_PATTERN.test(brandColor)) {
    throw new Error("صيغة اللون غير صحيحة — استخدم صيغة hex مثل ‎#2563eb");
  }

  const { error } = await supabase.from("org_settings").upsert(
    {
      org_id: orgId,
      org_display_name: settings.orgDisplayName.trim() || null,
      logo_url: settings.logoUrl.trim() || null,
      brand_color: brandColor || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "org_id" }
  );

  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export type SubscriptionInfo = {
  plan: PlanKey;
  subscriptionStatus: string;
  aiUsageCount: number;
  aiMonthlyQuota: number;
  planExpiresAt: string | null;
};

const DEFAULT_SUBSCRIPTION_INFO: SubscriptionInfo = {
  plan: "free",
  subscriptionStatus: "inactive",
  aiUsageCount: 0,
  aiMonthlyQuota: PLAN_QUOTAS.free,
  planExpiresAt: null,
};

export async function getSubscriptionInfo(): Promise<SubscriptionInfo> {
  const { orgId } = await auth();
  if (!orgId) return DEFAULT_SUBSCRIPTION_INFO;

  const { data, error } = await supabase
    .from("org_settings")
    .select("plan, subscription_status, ai_usage_count, ai_monthly_quota, plan_expires_at")
    .eq("org_id", orgId)
    .maybeSingle();

  if (error || !data) return DEFAULT_SUBSCRIPTION_INFO;

  return {
    plan: (data.plan as PlanKey) ?? "free",
    subscriptionStatus: data.subscription_status ?? "inactive",
    aiUsageCount: data.ai_usage_count ?? 0,
    aiMonthlyQuota: data.ai_monthly_quota ?? PLAN_QUOTAS.free,
    planExpiresAt: data.plan_expires_at ?? null,
  };
}
