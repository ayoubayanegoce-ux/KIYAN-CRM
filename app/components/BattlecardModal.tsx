"use client";

import { useState, useTransition } from "react";
import { Phone, X, Loader2, RotateCw, ShieldAlert } from "lucide-react";
import { generateBattlecardForLead } from "@/app/actions/outreach";
import type { SalesBattlecard } from "@/lib/ai";

export default function BattlecardModal({ leadId, leadName }: { leadId: string; leadName: string }) {
  const [open, setOpen] = useState(false);
  const [card, setCard] = useState<SalesBattlecard | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [isLoading, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function load() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await generateBattlecardForLead(leadId);
        setCard(result);
        setLoaded(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "فشل توليد سيناريو الاتصال");
      }
    });
  }

  function handleOpen() {
    setOpen(true);
    if (!loaded) load();
  }

  return (
    <>
      <button
        onClick={handleOpen}
        title="سيناريو الاتصال والاعتراضات"
        className="p-2 rounded-lg bg-slate-800 hover:bg-violet-700 text-slate-300 hover:text-white transition cursor-pointer"
      >
        <Phone size={14} />
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-xl p-6 space-y-4 max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Phone size={16} /> 📞 سيناريو الاتصال والاعتراضات — {leadName}
              </h3>
              <button
                onClick={() => setOpen(false)}
                className="text-slate-500 hover:text-slate-200 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {isLoading && !loaded ? (
              <div className="flex items-center justify-center py-12 text-slate-400 text-sm gap-2">
                <Loader2 size={16} className="animate-spin" /> جاري إعداد السيناريو...
              </div>
            ) : error ? (
              <div className="py-6 text-center space-y-3">
                <p className="text-red-400 text-sm">{error}</p>
                <button
                  onClick={load}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm cursor-pointer"
                >
                  إعادة المحاولة
                </button>
              </div>
            ) : (
              card && (
                <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                  <div className="p-3 bg-violet-950/20 border border-violet-900/50 rounded-lg space-y-1">
                    <p className="text-xs font-medium text-violet-400">🎯 جملة الافتتاحية (Pitch Hook)</p>
                    <p className="text-sm text-slate-200 italic">&quot;{card.pitchHook}&quot;</p>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-slate-400">سيناريو الاتصال الكامل (~دقيقتان)</p>
                    <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap p-3 bg-slate-950 border border-slate-800 rounded-lg">
                      {card.callScript}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                      <ShieldAlert size={13} /> مصفوفة التعامل مع الاعتراضات
                    </p>
                    {card.objections.map((o, i) => (
                      <div key={i} className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
                        <p className="text-xs font-medium text-amber-400">⚠️ {o.objection}</p>
                        <p className="text-sm text-slate-300">{o.response}</p>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={load}
                    disabled={isLoading}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <RotateCw size={14} className={isLoading ? "animate-spin" : ""} /> إعادة التوليد
                  </button>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </>
  );
}
