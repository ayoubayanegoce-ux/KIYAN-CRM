"use client";

import { useState, useTransition } from "react";
import { Workflow, X, Loader2, RotateCw, Send, CheckCircle2 } from "lucide-react";
import { generateSequenceForLead, approveSequence } from "@/app/actions/outreach";
import { SEQUENCE_STEP_LABELS_AR, type SequenceStep } from "@/lib/ai";

const STEP_TIMING_AR: Record<number, string> = {
  0: "اليوم",
  3: "بعد 3 أيام",
  7: "بعد 7 أيام",
};

export default function SequenceModal({ leadId, leadName }: { leadId: string; leadName: string }) {
  const [open, setOpen] = useState(false);
  const [steps, setSteps] = useState<SequenceStep[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [isLoading, startLoadTransition] = useTransition();
  const [isApproving, startApproveTransition] = useTransition();
  const [approved, setApproved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setError(null);
    setApproved(false);
    startLoadTransition(async () => {
      try {
        const result = await generateSequenceForLead(leadId);
        setSteps(result);
        setLoaded(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "فشل توليد التسلسل");
      }
    });
  }

  function handleOpen() {
    setOpen(true);
    if (!loaded) load();
  }

  function updateStep(index: number, field: "subject" | "body", value: string) {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  }

  function handleApprove() {
    setError(null);
    startApproveTransition(async () => {
      try {
        await approveSequence(leadId, steps);
        setApproved(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "فشل اعتماد التسلسل");
      }
    });
  }

  const hasEmptyStep = steps.some((s) => !s.subject.trim() || !s.body.trim());

  return (
    <>
      <button
        onClick={handleOpen}
        title="تسلسل متابعة ذكي (3 خطوات)"
        className="p-2 rounded-lg bg-slate-800 hover:bg-teal-700 text-slate-300 hover:text-white transition cursor-pointer"
      >
        <Workflow size={14} />
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-2xl p-6 space-y-4 max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Workflow size={16} /> تسلسل متابعة ذكي — {leadName}
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
                <Loader2 size={16} className="animate-spin" /> جاري توليد التسلسل...
              </div>
            ) : approved ? (
              <div className="py-10 text-center space-y-2">
                <CheckCircle2 size={36} className="mx-auto text-emerald-400" />
                <p className="text-sm text-slate-300">
                  تم إرسال الخطوة الأولى فوراً، وجدولة الخطوتين التاليتين كمهام متابعة في سجل النشاط.
                </p>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                  {steps.map((step, i) => (
                    <div key={step.step} className="border border-slate-800 rounded-lg p-3 space-y-2">
                      <p className="text-xs font-medium text-teal-400">
                        الخطوة {step.step} — {SEQUENCE_STEP_LABELS_AR[step.label]} ({STEP_TIMING_AR[step.delayDays]})
                      </p>
                      <input
                        value={step.subject}
                        onChange={(e) => updateStep(i, "subject", e.target.value)}
                        placeholder="عنوان الرسالة"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm focus:outline-blue-500"
                      />
                      <textarea
                        value={step.body}
                        onChange={(e) => updateStep(i, "body", e.target.value)}
                        rows={4}
                        placeholder="نص الرسالة"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm resize-none focus:outline-blue-500"
                      />
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={load}
                    disabled={isLoading}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium transition cursor-pointer disabled:opacity-50 flex items-center gap-2 shrink-0"
                  >
                    <RotateCw size={14} className={isLoading ? "animate-spin" : ""} /> إعادة التوليد
                  </button>
                  <button
                    onClick={handleApprove}
                    disabled={isApproving || hasEmptyStep}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                  >
                    {isApproving ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Send size={14} />
                    )}
                    اعتماد: إرسال الخطوة الأولى الآن + جدولة الباقي
                  </button>
                </div>

                {error && <p className="text-red-400 text-xs text-center">{error}</p>}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
