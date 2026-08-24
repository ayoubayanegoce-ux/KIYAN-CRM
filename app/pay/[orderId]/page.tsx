import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { getPaymentOrder } from "@/lib/paymentOrders";
import { getYouCanPayPublicKey } from "@/lib/youcanpay";
import PaymentForm from "./PaymentForm";

const CURRENCY_LABELS: Record<string, string> = { usd: "$", eur: "€", mad: "MAD" };

/**
 * صفحة عامة غير محمية بالتصميم — نفس منطق app/proposals/[dealId]:
 * order_id العشوائي غير القابل للتخمين هو "المفتاح" الذي يُشارَك مع الدافع
 * (سواء عضو منظمة يُجدِّد اشتراكاً أو عميل خارجي يدفع فاتورة صفقة). لا Clerk
 * auth() هنا عمداً.
 */
export default async function PayPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;

  const order = await getPaymentOrder(orderId);
  const publicKey = getYouCanPayPublicKey();

  if (!order || !order.token || !publicKey) notFound();

  const amountLabel = (Number(order.amount) / 100).toFixed(2);
  const currencyLabel = CURRENCY_LABELS[order.currency.toLowerCase()] ?? order.currency.toUpperCase();

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <h1 className="text-lg font-bold">إتمام الدفع</h1>
        <p className="text-sm text-slate-400">
          المبلغ: {amountLabel} {currencyLabel}
        </p>

        {order.status === "paid" ? (
          <p className="text-emerald-400 text-sm flex items-center gap-2">
            <CheckCircle2 size={16} /> تم الدفع بنجاح مسبقاً
          </p>
        ) : order.status === "failed" ? (
          <p className="text-red-400 text-sm">فشلت عملية الدفع هذه — الرجاء طلب رابط دفع جديد.</p>
        ) : (
          <PaymentForm publicKey={publicKey} token={order.token} />
        )}
      </div>
    </main>
  );
}
