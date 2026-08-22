"use client";

import { useRef, useState, useTransition } from "react";
import { Upload, Loader2, CheckCircle2, AlertTriangle, X } from "lucide-react";
import { importLeadsFromCsv, type ImportResult } from "@/app/actions/leads";

export default function ImportLeadsButton() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);
    setResult(null);

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      startTransition(async () => {
        try {
          const res = await importLeadsFromCsv(text);
          setResult(res);
        } catch (err) {
          setError(err instanceof Error ? err.message : "فشل الاستيراد");
        }
      });
    };
    reader.onerror = () => setError("تعذّرت قراءة الملف");
    reader.readAsText(file, "utf-8");
  }

  return (
    <div className="relative">
      <input ref={inputRef} type="file" accept=".csv,text/csv" onChange={handleFile} className="hidden" />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={isPending}
        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
      >
        {isPending ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
        استيراد CSV
      </button>

      {(result || error) && (
        <div className="absolute z-20 top-full mt-2 right-0 w-72 bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs space-y-2 shadow-lg">
          <div className="flex justify-between items-start">
            <span className="font-medium text-slate-300">نتيجة الاستيراد</span>
            <button
              onClick={() => {
                setResult(null);
                setError(null);
              }}
              className="text-slate-500 hover:text-slate-200 cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>

          {error && (
            <p className="text-red-400 flex items-center gap-1.5">
              <AlertTriangle size={13} /> {error}
            </p>
          )}

          {result && (
            <>
              <p className="text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 size={13} /> تم استيراد {result.imported} عميل وتقييمهم بالذكاء الاصطناعي
              </p>
              {result.skipped.length > 0 && (
                <div className="text-amber-400 space-y-1">
                  <p className="flex items-center gap-1.5">
                    <AlertTriangle size={13} /> تم تخطي {result.skipped.length} صف:
                  </p>
                  <ul className="pl-4 list-disc text-slate-400 max-h-24 overflow-y-auto">
                    {result.skipped.map((s, i) => (
                      <li key={i}>
                        سطر {s.row}: {s.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
