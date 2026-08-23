"use client";

import { useState, useTransition } from "react";
import { ExternalLink, Loader2 } from "lucide-react";

export default function ManageBillingButton() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/stripe/portal", { method: "POST" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "فشل فتح بوابة الفوترة");
        window.open(data.url, "_blank", "noopener,noreferrer");
      } catch (e) {
        setError(e instanceof Error ? e.message : "فشل فتح بوابة الفوترة");
      }
    });
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={isPending}
        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
      >
        {isPending ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
        إدارة الفواتير والبطاقة (Stripe Portal)
      </button>
      {error && <p className="text-red-400 text-xs mt-1.5">{error}</p>}
    </div>
  );
}
