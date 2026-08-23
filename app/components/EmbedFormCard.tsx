"use client";

import { useState } from "react";
import { Copy, Check, Globe } from "lucide-react";

export default function EmbedFormCard({ orgId, appUrl }: { orgId: string; appUrl: string }) {
  const [copiedField, setCopiedField] = useState<"link" | "embed" | null>(null);

  const shareLink = `${appUrl}/forms/${orgId}`;
  const embedCode = `<iframe src="${shareLink}" width="100%" height="640" style="border:0;border-radius:12px;" title="نموذج استقبال العملاء"></iframe>`;

  function copy(text: string, field: "link" | "embed") {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-3">
      <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
        <Globe size={16} /> نموذج استقبال العملاء العام
      </h3>
      <p className="text-xs text-slate-500">
        شارك هذا الرابط أو ضع كود التضمين في موقعك لاستقبال عملاء جدد مباشرة — يُقيَّمون بالذكاء الاصطناعي
        فور الوصول وتُرسل لك تنبيهات واتساب تلقائياً للعملاء المؤهلين.
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => copy(shareLink, "link")}
          className="flex-1 min-w-[140px] py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition cursor-pointer"
        >
          {copiedField === "link" ? <Check size={13} /> : <Copy size={13} />} نسخ رابط المشاركة
        </button>
        <button
          onClick={() => copy(embedCode, "embed")}
          className="flex-1 min-w-[140px] py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition cursor-pointer"
        >
          {copiedField === "embed" ? <Check size={13} /> : <Copy size={13} />} نسخ كود التضمين
        </button>
      </div>
    </div>
  );
}
