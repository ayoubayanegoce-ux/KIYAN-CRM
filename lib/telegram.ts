import { supabase } from "@/lib/supabase";
import { getAppUrl } from "@/lib/appUrl";

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** يرمي عند فشل الإرسال — يُستخدَم مباشرة من زر الاختبار اليدوي الذي يحتاج رؤية سبب الفشل الفعلي. */
export async function sendTelegramMessage(botToken: string, chatId: string, text: string): Promise<void> {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { description?: string } | null;
    throw new Error(body?.description || `Telegram API error: ${res.status}`);
  }
}

export type TelegramLeadInfo = {
  name: string;
  email: string;
  company: string | null;
  ai_score: number;
  ai_intent: string | null;
  painPoints?: string | null;
};

export async function sendTelegramAlert({
  botToken,
  chatId,
  lead,
  appUrl,
}: {
  botToken: string;
  chatId: string;
  lead: TelegramLeadInfo;
  appUrl?: string;
}): Promise<void> {
  const scoreLabel = lead.ai_intent ? lead.ai_intent.toUpperCase() : "COLD";

  const lines: string[] = [`🔥 <b>عميل جديد مؤهل ${scoreLabel}!</b>`, ""];
  lines.push(`👤 <b>الاسم:</b> ${escapeHtml(lead.name)}`);
  if (lead.company) lines.push(`🏢 <b>الشركة:</b> ${escapeHtml(lead.company)}`);
  lines.push(`📧 <b>البريد:</b> ${escapeHtml(lead.email)}`);
  lines.push(`📊 <b>التقييم:</b> ${lead.ai_score}/100 (${scoreLabel})`);
  if (lead.painPoints) lines.push(`⚠️ <b>التحديات المستنتجة:</b> ${escapeHtml(lead.painPoints)}`);
  if (appUrl) lines.push("", `🔗 <a href="${appUrl}">فتح العميل في لوحة التحكم</a>`);

  await sendTelegramMessage(botToken, chatId, lines.join("\n"));
}

type OrgTelegramConfig = {
  telegram_enabled: boolean | null;
  telegram_bot_token: string | null;
  telegram_chat_id: string | null;
};

async function getOrgTelegramConfig(orgId: string): Promise<OrgTelegramConfig | null> {
  const { data, error } = await supabase
    .from("org_settings")
    .select("telegram_enabled, telegram_bot_token, telegram_chat_id")
    .eq("org_id", orgId)
    .maybeSingle();

  if (error || !data?.telegram_enabled || !data.telegram_bot_token || !data.telegram_chat_id) return null;
  return data;
}

/**
 * لا يرمي أبداً — قناة إشعار اختيارية لكل منظمة (بوت/محادثة خاصة بها، محفوظة
 * في org_settings وليست متغيرات بيئة عامة)، يجب ألا يكسر فشلها أو عدم
 * تفعيلها تدفّق إنشاء العميل. تُستدعى من كل مسارات استقبال العملاء
 * (addLead، استيراد CSV، الويب هوك، النموذج العام).
 */
export async function notifyHotLeadViaTelegram(orgId: string, lead: TelegramLeadInfo): Promise<void> {
  try {
    const config = await getOrgTelegramConfig(orgId);
    if (!config) return;

    const appUrl = await getAppUrl();
    await sendTelegramAlert({
      botToken: config.telegram_bot_token!,
      chatId: config.telegram_chat_id!,
      lead,
      appUrl: appUrl || undefined,
    });
  } catch (error) {
    console.error("Telegram hot-lead alert send error:", error);
  }
}

/** نفس فلسفة notifyHotLeadViaTelegram — إشعار الطيار الآلي بعد إرسال بريد تلقائي، لا يرمي أبداً. */
export async function notifyAutoPilotSentViaTelegram(
  orgId: string,
  lead: { name: string; company: string | null },
  subject: string
): Promise<void> {
  try {
    const config = await getOrgTelegramConfig(orgId);
    if (!config) return;

    const text = [
      `🤖 <b>الطيار الآلي أرسل بريداً تلقائياً</b>`,
      "",
      `👤 <b>العميل:</b> ${escapeHtml(lead.name)} (${escapeHtml(lead.company || "بدون شركة")})`,
      `✉️ <b>الموضوع:</b> ${escapeHtml(subject)}`,
    ].join("\n");

    await sendTelegramMessage(config.telegram_bot_token!, config.telegram_chat_id!, text);
  } catch (error) {
    console.error("Telegram auto-pilot alert send error:", error);
  }
}
