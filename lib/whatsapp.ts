import twilio from "twilio";

function appLink(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL;
  return base ? `\nرابط مباشر: ${base.replace(/\/$/, "")}` : "";
}

/**
 * Raw WhatsApp send via Twilio. Never throws — a failed/misconfigured
 * notification channel must not break the lead-creation flow that
 * triggered it. Logs and returns silently when credentials are missing
 * or the send itself fails.
 */
export async function sendWhatsAppAlert(message: string): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_NUMBER;
  const to = process.env.MY_WHATSAPP_NUMBER;

  if (!accountSid || !authToken || !from || !to) {
    console.error("Twilio WhatsApp env vars are not fully configured; skipping alert");
    return;
  }

  try {
    const client = twilio(accountSid, authToken);
    await client.messages.create({ from, to, body: message });
  } catch (error) {
    console.error("WhatsApp alert send error:", error);
  }
}

type HotLeadInfo = {
  name: string;
  email: string;
  company: string | null;
  ai_score: number;
  ai_intent: string | null;
  reasoning?: string;
};

export async function notifyHotLead(lead: HotLeadInfo): Promise<void> {
  const message =
    `🔥 عميل جديد مؤهل HOT!\n` +
    `الاسم: ${lead.name}\n` +
    `الشركة: ${lead.company || "غير محدد"}\n` +
    `البريد: ${lead.email}\n` +
    `التقييم: ${lead.ai_score}/100 (${(lead.ai_intent || "").toUpperCase()})` +
    (lead.reasoning ? `\nنقطة القوة: ${lead.reasoning}` : "") +
    appLink();

  await sendWhatsAppAlert(message);
}

export async function notifyAutoPilotSent(
  lead: { name: string; company: string | null },
  subject: string
): Promise<void> {
  const message =
    `🤖 الطيار الآلي أرسل بريداً تلقائياً\n` +
    `العميل: ${lead.name} (${lead.company || "بدون شركة"})\n` +
    `الموضوع: ${subject}` +
    appLink();

  await sendWhatsAppAlert(message);
}
