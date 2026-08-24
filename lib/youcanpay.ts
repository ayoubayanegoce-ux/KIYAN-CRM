export type YouCanPayConfig = { priKey: string; pubKey: string; sandbox: boolean };

/**
 * Lazily reads config from env — same lazy-null pattern as the old lib/stripe.ts.
 * Sandbox is true if YOUCAN_PAY_IS_SANDBOX is set OR the key itself is a
 * pri_sandbox_ key, so a stale flag can't silently point live traffic at
 * the sandbox endpoint (or vice versa).
 */
export function getYouCanPayConfig(): YouCanPayConfig | null {
  const priKey = process.env.YOUCAN_PAY_PRIVATE_KEY;
  const pubKey = process.env.NEXT_PUBLIC_YOUCAN_PAY_PUBLIC_KEY;
  if (!priKey || !pubKey) return null;
  const sandbox = process.env.YOUCAN_PAY_IS_SANDBOX === "true" || priKey.startsWith("pri_sandbox_");
  return { priKey, pubKey, sandbox };
}

export function isYouCanPayConfigured(): boolean {
  return getYouCanPayConfig() !== null;
}

/** آمن للتضمين في الواجهة (مثل Stripe publishable key) — ليس سراً. */
export function getYouCanPayPublicKey(): string | null {
  return getYouCanPayConfig()?.pubKey ?? null;
}

export type TokenizeParams = {
  orderId: string;
  amount: number;
  currency: string;
  successUrl?: string;
  errorUrl?: string;
  metadata?: Record<string, string>;
  customer?: { name?: string; email?: string; phone?: string };
};

export type TokenizeResult = { transactionId: string; token: string };

/**
 * ينشئ عملية دفع لدى YouCanPay ويُرجع token يُستخدَم لاحقاً في yp.js لعرض
 * نموذج الدفع (لا يوجد رابط checkout مُستضاف جاهز كما في Stripe).
 */
export async function tokenizePayment(params: TokenizeParams): Promise<TokenizeResult> {
  const config = getYouCanPayConfig();
  if (!config) {
    throw new Error("YouCanPay غير مُهيَّأ: أضف YOUCANPAY_PRIVATE_KEY و NEXT_PUBLIC_YOUCANPAY_PUBLIC_KEY");
  }

  const endpoint = config.sandbox
    ? "https://youcanpay.com/sandbox/api/tokenize"
    : "https://youcanpay.com/api/tokenize";

  const form = new FormData();
  form.set("pri_key", config.priKey);
  form.set("order_id", params.orderId);
  form.set("amount", String(params.amount));
  form.set("currency", params.currency);
  if (params.successUrl) form.set("success_url", params.successUrl);
  if (params.errorUrl) form.set("error_url", params.errorUrl);
  if (params.metadata) {
    for (const [key, value] of Object.entries(params.metadata)) {
      form.set(`metadata[${key}]`, value);
    }
  }
  if (params.customer) {
    for (const [key, value] of Object.entries(params.customer)) {
      if (value) form.set(`customer[${key}]`, value);
    }
  }

  const res = await fetch(endpoint, { method: "POST", headers: { Accept: "application/json" }, body: form });
  const data = await res.json().catch(() => null);

  if (!res.ok || !data?.token || !data?.transaction_id) {
    throw new Error(data?.message || "تعذّر إنشاء عملية الدفع عبر YouCanPay");
  }

  return { transactionId: data.transaction_id, token: data.token };
}
