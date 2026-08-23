"use client";

import { useState, useTransition } from "react";
import { Check, CreditCard, Loader2 } from "lucide-react";
import { PLAN_DISPLAY, type PlanKey } from "@/lib/plans";

const PAID_PLANS: Exclude<PlanKey, "free">[] = ["starter", "pro", "enterprise"];

const FEATURES_BY_PLAN: Record<Exclude<PlanKey, "free">, string[]> = {
  starter: ["حتى 200 استدعاء ذكاء اصطناعي/شهر", "تأهيل وإثراء تلقائي للعملاء", "نموذج استقبال عام + تضمين"],
  pro: ["حتى 1000 استدعاء ذكاء اصطناعي/شهر", "الطيار الآلي والتسلسلات الذكية", "إدارة فريق وتوزيع عملاء", "تقارير تنفيذية"],
  enterprise: ["بلا حد أقصى لاستدعاءات الذكاء الاصطناعي", "علامة تجارية بيضاء كاملة", "دعم أولوية", "كل ميزات Pro"],
};

export default function BillingPricingCards({ currentPlan }: { currentPlan: PlanKey }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {PAID_PLANS.map((plan) => (
        <PlanCard key={plan} plan={plan} isCurrent={currentPlan === plan} highlighted={plan === "pro"} />
      ))}
    </div>
  );
}

function PlanCard({
  plan,
  isCurrent,
  highlighted,
}: {
  plan: Exclude<PlanKey, "free">;
  isCurrent: boolean;
  highlighted: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const info = PLAN_DISPLAY[plan];

  function handleSubscribe() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "فشل بدء الاشتراك");
        window.location.href = data.url;
      } catch (e) {
        setError(e instanceof Error ? e.message : "فشل بدء الاشتراك");
      }
    });
  }

  return (
    <div
      className={`rounded-xl p-6 space-y-4 border flex flex-col ${
        isCurrent
          ? "bg-emerald-950/20 border-emerald-700"
          : highlighted
          ? "bg-slate-900 border-blue-600 ring-1 ring-blue-600"
          : "bg-slate-900 border-slate-800"
      }`}
    >
      {isCurrent ? (
        <span className="self-start text-[10px] px-2 py-1 rounded-full bg-emerald-600 text-white font-medium">
          الخطة الحالية
        </span>
      ) : highlighted ? (
        <span className="self-start text-[10px] px-2 py-1 rounded-full bg-blue-600 text-white font-medium">
          الأكثر شيوعاً
        </span>
      ) : null}

      <div>
        <h3 className="text-lg font-semibold text-slate-100">{info.name}</h3>
        <p className="text-3xl font-bold text-slate-100 mt-1">
          ${info.priceUsd}
          <span className="text-sm font-normal text-slate-500">/شهر</span>
        </p>
      </div>

      <ul className="space-y-2 flex-1">
        {FEATURES_BY_PLAN[plan].map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-slate-400">
            <Check size={15} className="text-emerald-400 shrink-0 mt-0.5" /> {f}
          </li>
        ))}
      </ul>

      <button
        onClick={handleSubscribe}
        disabled={isPending || isCurrent}
        className={`w-full py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition cursor-pointer disabled:cursor-not-allowed ${
          isCurrent
            ? "bg-emerald-900/40 text-emerald-400 disabled:opacity-100"
            : highlighted
            ? "bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
            : "bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-50"
        }`}
      >
        {isPending ? (
          <Loader2 size={14} className="animate-spin" />
        ) : isCurrent ? (
          <Check size={14} />
        ) : (
          <CreditCard size={14} />
        )}
        {isCurrent ? "مُفعَّلة حالياً" : "الاشتراك الآن"}
      </button>
      {error && <p className="text-red-400 text-xs text-center">{error}</p>}
    </div>
  );
}
