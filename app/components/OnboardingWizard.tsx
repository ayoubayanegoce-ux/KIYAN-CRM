"use client";

import { useState, useTransition } from "react";
import { Sparkles, Loader2, CheckCircle2, Link2, X } from "lucide-react";
import { completeOnboarding, type AITone, type AILanguage } from "@/app/actions/settings";
import EmbedFormCard from "./EmbedFormCard";

const TONE_OPTIONS: { value: AITone; label: string }[] = [
  { value: "professionnel", label: "Professionnel" },
  { value: "amical", label: "Amical" },
  { value: "direct", label: "Direct & Commercial" },
  { value: "negociation", label: "Négociation" },
];

const LANGUAGE_OPTIONS: { value: AILanguage; label: string }[] = [
  { value: "fr", label: "Français" },
  { value: "en", label: "Anglais" },
  { value: "ar", label: "Arabe" },
];

export default function OnboardingWizard({ orgId, appUrl }: { orgId: string; appUrl: string }) {
  const [dismissed, setDismissed] = useState(false);
  const [step, setStep] = useState(1);
  const [orgDisplayName, setOrgDisplayName] = useState("");
  const [valueProposition, setValueProposition] = useState("");
  const [icp, setIcp] = useState("");
  const [bookingUrl, setBookingUrl] = useState("");
  const [tone, setTone] = useState<AITone>("professionnel");
  const [language, setLanguage] = useState<AILanguage>("fr");
  const [isSaving, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (dismissed) return null;

  function handleFinish() {
    setError(null);
    startTransition(async () => {
      try {
        await completeOnboarding({ orgDisplayName, valueProposition, icp, bookingUrl, tone, language });
        setDismissed(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "فشل حفظ الإعداد");
      }
    });
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg p-6 space-y-5 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-100">
            <Sparkles size={18} className="text-blue-400" /> إعداد سريع لبدء الاستخدام
          </h2>
          <button
            onClick={() => setDismissed(true)}
            title="تخطي الآن"
            className="text-slate-500 hover:text-slate-200 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex gap-1.5">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`h-1 flex-1 rounded-full ${s <= step ? "bg-blue-600" : "bg-slate-800"}`} />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              الخطوة 1/3 — عرّفنا بشركتك حتى يبني الذكاء الاصطناعي رسائله بناءً على سياقك الفعلي.
            </p>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">اسم الشركة</label>
              <input
                value={orgDisplayName}
                onChange={(e) => setOrgDisplayName(e.target.value)}
                placeholder="KIYAN Solutions"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm focus:outline-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">مجال العمل ونبذة عن نشاطك</label>
              <textarea
                value={valueProposition}
                onChange={(e) => setValueProposition(e.target.value)}
                rows={3}
                placeholder="مثال: نقدّم حلولاً لوجستية ذكية تساعد الشركات على تقليل تكاليف الشحن..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm resize-none focus:outline-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">الجمهور المستهدف (ICP)</label>
              <textarea
                value={icp}
                onChange={(e) => setIcp(e.target.value)}
                rows={2}
                placeholder="مثال: شركات SaaS متوسطة الحجم، صنّاع القرار: مدراء المبيعات والعمليات"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm resize-none focus:outline-blue-500"
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              الخطوة 2/3 — رابط حجز المواعيد يُضاف تلقائياً كزر دعوة لاتخاذ إجراء في كل بريد يُرسَل.
            </p>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block flex items-center gap-1.5">
                <Link2 size={12} /> رابط حجز الموعد (Cal.com / Calendly)
              </label>
              <input
                type="url"
                value={bookingUrl}
                onChange={(e) => setBookingUrl(e.target.value)}
                placeholder="https://cal.com/your-name/intro"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm focus:outline-blue-500"
              />
              <p className="text-[10px] text-slate-500 mt-1">اختياري — يمكن إضافته لاحقاً من الإعدادات.</p>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500">الخطوة 3/3 — نبرة المراسلة، ونموذج استقبال العملاء الجاهز للمشاركة.</p>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">نبرة التواصل (Tone)</label>
              <div className="grid grid-cols-2 gap-2">
                {TONE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setTone(opt.value)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                      tone === opt.value ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">لغة المراسلة (Language)</label>
              <div className="flex gap-2">
                {LANGUAGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setLanguage(opt.value)}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                      language === opt.value ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <EmbedFormCard orgId={orgId} appUrl={appUrl} />
          </div>
        )}

        {error && <p className="text-red-400 text-xs text-center">{error}</p>}

        <div className="flex gap-2 pt-1">
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium transition cursor-pointer"
            >
              رجوع
            </button>
          )}
          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition cursor-pointer"
            >
              التالي
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={isSaving}
              className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              إنهاء الإعداد
            </button>
          )}
        </div>

        <button
          onClick={() => setDismissed(true)}
          className="text-[11px] text-slate-600 hover:text-slate-400 text-center w-full cursor-pointer"
        >
          تخطي الآن، أذكرني لاحقاً
        </button>
      </div>
    </div>
  );
}
