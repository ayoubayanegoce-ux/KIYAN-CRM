"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, X, Zap } from "lucide-react";

/**
 * تنبيه لطيف غير معطِّل — بطاقة عائمة قابلة للإغلاق، وليست نافذة حاجبة
 * (لا overlay ولا blocking) حتى يبقى تصفّح بقية بيانات الـ CRM ممكناً بالكامل
 * حتى بعد تجاوز الحصة الشهرية.
 */
export default function QuotaLimitBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 z-40 max-w-sm bg-slate-900 border border-red-800/60 rounded-xl p-4 shadow-lg shadow-black/30 space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-red-400 flex items-center gap-1.5">
          <AlertTriangle size={15} /> نفدت حصتك الشهرية من الذكاء الاصطناعي
        </p>
        <button
          onClick={() => setDismissed(true)}
          className="text-slate-500 hover:text-slate-300 cursor-pointer shrink-0"
        >
          <X size={16} />
        </button>
      </div>
      <p className="text-xs text-slate-400 leading-relaxed">
        وصلت إلى الحد الشهري لاستدعاءات الذكاء الاصطناعي (تأهيل، إثراء، مراسلات). يمكنك متابعة استخدام بقية
        الـ CRM بشكل طبيعي، أو ترقية خطتك لاستعادة الوصول الفوري.
      </p>
      <div className="flex gap-2">
        <Link
          href="/billing"
          className="flex-1 text-center py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs font-medium text-white transition flex items-center justify-center gap-1.5"
        >
          <Zap size={13} /> ترقية الباقة
        </Link>
        <button
          onClick={() => setDismissed(true)}
          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-medium text-slate-300 transition cursor-pointer"
        >
          لاحقاً
        </button>
      </div>
    </div>
  );
}
