"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

type YpPaymentElement = {
  mount: () => Promise<void>;
  confirm: () => Promise<{ status: "succeeded" | "failed"; error?: { message: string } }>;
};

declare global {
  interface Window {
    yp?: (publicKey: string, options?: { locale?: string }) => {
      elements: (options: { token: string; container: string }) => YpPaymentElement;
    };
  }
}

export default function PaymentForm({ publicKey, token }: { publicKey: string; token: string }) {
  const [scriptReady, setScriptReady] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState<"idle" | "confirming" | "succeeded" | "failed">("idle");
  const [error, setError] = useState<string | null>(null);
  const elementRef = useRef<YpPaymentElement | null>(null);

  useEffect(() => {
    if (!scriptReady || mounted || elementRef.current || !window.yp) return;

    const element = window.yp(publicKey, { locale: "ar" }).elements({ token, container: "#youcanpay-payment" });
    elementRef.current = element;

    element
      .mount()
      .then(() => setMounted(true))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "تعذّر تحميل نموذج الدفع"));
  }, [scriptReady, mounted, publicKey, token]);

  async function handleConfirm() {
    if (!elementRef.current) return;
    setStatus("confirming");
    setError(null);
    try {
      const result = await elementRef.current.confirm();
      if (result.status === "succeeded") {
        setStatus("succeeded");
      } else {
        setStatus("failed");
        setError(result.error?.message ?? "فشل الدفع");
      }
    } catch (e) {
      setStatus("failed");
      setError(e instanceof Error ? e.message : "فشل الدفع");
    }
  }

  return (
    <div className="space-y-4">
      <Script src="https://youcanpay.com/yp.js" onReady={() => setScriptReady(true)} />

      <div id="youcanpay-payment" className="min-h-[120px]" />
      {!mounted && (
        <div className="flex items-center justify-center py-6 text-slate-500">
          <Loader2 className="animate-spin" size={20} />
        </div>
      )}

      {status === "succeeded" ? (
        <p className="text-emerald-400 text-sm flex items-center gap-2">
          <CheckCircle2 size={16} /> تم الدفع بنجاح
        </p>
      ) : (
        <button
          onClick={handleConfirm}
          disabled={!mounted || status === "confirming"}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
        >
          {status === "confirming" ? <Loader2 size={14} className="animate-spin" /> : "تأكيد الدفع"}
        </button>
      )}
      {error && (
        <p className="text-red-400 text-xs flex items-center gap-1.5">
          <AlertCircle size={13} /> {error}
        </p>
      )}
    </div>
  );
}
