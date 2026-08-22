"use client";

import { useState, useTransition } from "react";
import { Zap, ZapOff, Loader2 } from "lucide-react";
import { setAutopilotSetting } from "@/app/actions/settings";

export default function AutoPilotToggle({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [isPending, startTransition] = useTransition();

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    startTransition(async () => {
      try {
        await setAutopilotSetting(next);
      } catch (error) {
        console.error(error);
        setEnabled(!next);
      }
    });
  }

  return (
    <button
      onClick={toggle}
      disabled={isPending}
      title="الطيار الآلي: إرسال بريد تلقائي فوري للعملاء المؤهلين (تقييم 80+ أو تصنيف HOT)"
      className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition cursor-pointer disabled:opacity-60 ${
        enabled
          ? "bg-emerald-600 hover:bg-emerald-700 text-white"
          : "bg-slate-800 hover:bg-slate-700 text-slate-400"
      }`}
    >
      {isPending ? (
        <Loader2 size={14} className="animate-spin" />
      ) : enabled ? (
        <Zap size={14} />
      ) : (
        <ZapOff size={14} />
      )}
      الطيار الآلي {enabled ? "مفعّل" : "معطّل"}
    </button>
  );
}
