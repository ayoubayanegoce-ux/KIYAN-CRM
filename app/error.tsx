"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled app error:", error);
  }, [error]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-xl p-8 text-center space-y-4">
        <AlertTriangle size={40} className="mx-auto text-amber-400" />
        <h1 className="text-lg font-semibold">حدث خطأ غير متوقع</h1>
        <p className="text-sm text-slate-400">
          تعذّر إتمام هذا الطلب. حاول مرة أخرى، وإن تكرر الخطأ تحقق من سجلات الخادم
          {error.digest ? ` (المعرّف: ${error.digest})` : ""}.
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition cursor-pointer inline-flex items-center gap-2"
        >
          <RotateCw size={14} /> إعادة المحاولة
        </button>
      </div>
    </main>
  );
}
