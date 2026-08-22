"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { Zap, ZapOff, Loader2 } from "lucide-react";
import { setAutopilotSetting } from "@/app/actions/settings";

const STORAGE_KEY = "crm_autopilot_enabled";

function subscribeToStorage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function readStoredValue(): boolean | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw === null ? null : raw === "true";
}

// لا وجود لـ localStorage على الخادم ولا في أول عرض على العميل قبل الترطيب،
// فنُرجع null هنا لضمان تطابق الناتج مع الخادم وتفادي أي Hydration mismatch.
function readServerValue(): boolean | null {
  return null;
}

export default function AutoPilotToggle({ initialEnabled }: { initialEnabled: boolean }) {
  // useSyncExternalStore هو الأسلوب الآمن لقراءة مصدر خارجي كـ localStorage:
  // يُرجع null أثناء الـ SSR/أول عرض (مطابقاً initialEnabled)، ثم بعد الترطيب
  // يقرأ القيمة الفعلية المحفوظة محلياً — دون اللجوء إلى setState داخل useEffect.
  const storedValue = useSyncExternalStore(subscribeToStorage, readStoredValue, readServerValue);
  const [override, setOverride] = useState<boolean | null>(null);
  const [isPending, startTransition] = useTransition();

  const enabled = override ?? storedValue ?? initialEnabled;

  function toggle() {
    const next = !enabled;
    setOverride(next);
    localStorage.setItem(STORAGE_KEY, String(next));

    startTransition(async () => {
      try {
        await setAutopilotSetting(next);
      } catch (error) {
        console.error(error);
        setOverride(!next);
        localStorage.setItem(STORAGE_KEY, String(!next));
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
