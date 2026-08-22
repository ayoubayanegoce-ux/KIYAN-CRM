"use client";

import { useState, useTransition } from "react";
import { Sparkles, Loader2, RotateCw } from "lucide-react";
import { getSalesInsight } from "@/app/actions/analytics";

export default function AiInsightCard() {
  const [isPending, startTransition] = useTransition();
  const [summary, setSummary] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function generate() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await getSalesInsight();
        setSummary(res.summary);
        setNextAction(res.nextAction);
        setLoaded(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "فشل توليد التحليل");
      }
    });
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Sparkles size={16} className="text-amber-400" /> ملخص ذكي وتوصية المبيعات
        </h3>
        <button
          onClick={generate}
          disabled={isPending}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs font-medium transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
        >
          {isPending ? <Loader2 size={13} className="animate-spin" /> : <RotateCw size={13} />}
          {loaded ? "إعادة التحليل" : "توليد التحليل"}
        </button>
      </div>

      {!loaded && !isPending && !error && (
        <p className="text-slate-500 text-sm">
          اضغط على &quot;توليد التحليل&quot; للحصول على تحليل ذكي لخط المبيعات الحالي واقتراح الإجراء التالي.
        </p>
      )}

      {isPending && (
        <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
          <Loader2 size={16} className="animate-spin" /> جاري التحليل...
        </div>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {loaded && !isPending && (
        <div className="space-y-3">
          <p className="text-sm text-slate-300 leading-relaxed">{summary}</p>
          {nextAction && (
            <div className="p-3 bg-slate-950 border border-blue-900/50 rounded-lg">
              <p className="text-xs text-blue-400 font-medium mb-1">الإجراء المقترح التالي</p>
              <p className="text-sm text-slate-200">{nextAction}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
