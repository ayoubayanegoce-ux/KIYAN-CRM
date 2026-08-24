import { randomUUID } from "node:crypto";
import { supabase } from "@/lib/supabase";

export type PaymentOrderKind = "subscription" | "deal";

export type PaymentOrder = {
  order_id: string;
  org_id: string;
  kind: PaymentOrderKind;
  deal_id: string | null;
  plan: string | null;
  amount: string;
  currency: string;
  token: string | null;
  transaction_id: string | null;
  status: "pending" | "paid" | "failed";
  created_at: string;
};

/**
 * order_id مُولَّد عشوائياً (UUID) بادئة بنوع العملية — هذا العشوائية هي خط
 * الدفاع الوحيد ضد استدعاءات ويب هوك مُزوَّرة (YouCanPay لا يوفّر توقيعاً
 * للتحقق)، لذا يجب ألا يكون العنصر الأول للـ order_id قابلاً للتخمين أبداً.
 */
export async function createPendingOrder(params: {
  orgId: string;
  kind: PaymentOrderKind;
  dealId?: string;
  plan?: string;
  amount: number;
  currency: string;
}): Promise<string> {
  const orderId = `${params.kind}_${randomUUID()}`;

  const { error } = await supabase.from("payment_orders").insert({
    order_id: orderId,
    org_id: params.orgId,
    kind: params.kind,
    deal_id: params.dealId ?? null,
    plan: params.plan ?? null,
    amount: String(params.amount),
    currency: params.currency,
  });

  if (error) throw new Error(error.message);
  return orderId;
}

export async function attachTokenToOrder(orderId: string, token: string, transactionId: string) {
  const { error } = await supabase
    .from("payment_orders")
    .update({ token, transaction_id: transactionId })
    .eq("order_id", orderId);

  if (error) throw new Error(error.message);
}

export async function getPaymentOrder(orderId: string): Promise<PaymentOrder | null> {
  const { data } = await supabase.from("payment_orders").select("*").eq("order_id", orderId).maybeSingle();
  return data ?? null;
}

/**
 * يُحوِّل الطلب من pending إلى status نهائياً مرة واحدة فقط (WHERE status='pending'
 * يضمن التزامن الآمن ضد أحداث ويب هوك مكررة/متأخرة). يتحقق أيضاً من تطابق
 * amount/currency مع ما أنشأناه نحن — دفاع إضافي بغياب توقيع من YouCanPay.
 */
export async function claimPaymentOrder(
  orderId: string,
  amount: string,
  currency: string,
  status: "paid" | "failed"
): Promise<PaymentOrder | null> {
  const order = await getPaymentOrder(orderId);
  if (!order || order.status !== "pending") return null;

  if (order.amount !== amount || order.currency.toLowerCase() !== currency.toLowerCase()) {
    console.error(`YouCanPay webhook amount/currency mismatch for order ${orderId}`);
    return null;
  }

  const { data: updated } = await supabase
    .from("payment_orders")
    .update({ status })
    .eq("order_id", orderId)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();

  return updated ?? null;
}
