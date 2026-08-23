"use client";

import { useState, useTransition } from "react";
import { Settings, X, Loader2, Save, Check, Link2, MessageCircle, Send, CheckCircle2, XCircle } from "lucide-react";
import {
  getAISettings,
  setAISettings,
  checkTwilioStatus,
  sendTestWhatsApp,
  type AITone,
  type AILanguage,
  type TwilioConfigStatus,
} from "@/app/actions/settings";

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

export default function SettingsModal() {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [tone, setTone] = useState<AITone>("professionnel");
  const [language, setLanguage] = useState<AILanguage>("fr");
  const [valueProposition, setValueProposition] = useState("");
  const [bookingUrl, setBookingUrl] = useState("");
  const [isLoading, startLoadTransition] = useTransition();
  const [isSaving, startSaveTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [twilioStatus, setTwilioStatus] = useState<TwilioConfigStatus | null>(null);
  const [isTesting, startTestTransition] = useTransition();
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  function load() {
    setError(null);
    startLoadTransition(async () => {
      try {
        const [settings, twilio] = await Promise.all([getAISettings(), checkTwilioStatus()]);
        setTone(settings.tone);
        setLanguage(settings.language);
        setValueProposition(settings.valueProposition);
        setBookingUrl(settings.bookingUrl);
        setTwilioStatus(twilio);
        setLoaded(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "فشل تحميل الإعدادات");
      }
    });
  }

  function handleOpen() {
    setOpen(true);
    if (!loaded) load();
  }

  function handleSave() {
    setError(null);
    setSaved(false);
    startSaveTransition(async () => {
      try {
        await setAISettings({ tone, language, valueProposition, bookingUrl });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch (e) {
        setError(e instanceof Error ? e.message : "فشل حفظ الإعدادات");
      }
    });
  }

  function handleTestWhatsApp() {
    setTestResult(null);
    startTestTransition(async () => {
      try {
        const result = await sendTestWhatsApp();
        setTestResult(result);
      } catch (e) {
        setTestResult({ success: false, message: e instanceof Error ? e.message : "فشل الاختبار" });
      }
    });
  }

  return (
    <>
      <button
        onClick={handleOpen}
        title="إعدادات نبرة ولغة الذكاء الاصطناعي"
        className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
      >
        <Settings size={16} />
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 space-y-4 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Settings size={16} /> إعدادات الذكاء الاصطناعي
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
                <Loader2 size={16} className="animate-spin" /> جاري التحميل...
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">نبرة التواصل (Tone)</label>
                  <div className="grid grid-cols-2 gap-2">
                    {TONE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setTone(opt.value)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                          tone === opt.value
                            ? "bg-blue-600 text-white"
                            : "bg-slate-800 text-slate-400 hover:text-slate-200"
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
                          language === opt.value
                            ? "bg-blue-600 text-white"
                            : "bg-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">
                    نبذة عن الشركة (Value Proposition)
                  </label>
                  <textarea
                    value={valueProposition}
                    onChange={(e) => setValueProposition(e.target.value)}
                    rows={4}
                    placeholder="مثال: نقدم حلولاً لوجستية ذكية تساعد الشركات على تقليل تكاليف الشحن..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm resize-none focus:outline-blue-500"
                  />
                </div>

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
                  <p className="text-[10px] text-slate-500 mt-1">
                    يُضاف تلقائياً كزر حجز في نهاية كل بريد مُرسَل (يدوياً أو عبر الطيار الآلي).
                  </p>
                </div>

                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : saved ? (
                    <Check size={14} />
                  ) : (
                    <Save size={14} />
                  )}
                  {saved ? "تم الحفظ" : "حفظ الإعدادات"}
                </button>

                {error && <p className="text-red-400 text-xs text-center">{error}</p>}

                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                    <MessageCircle size={13} /> إشعارات واتساب (Twilio)
                  </p>

                  {twilioStatus && (
                    <div
                      className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg border ${
                        twilioStatus.configured
                          ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                          : "bg-amber-950 text-amber-400 border-amber-800"
                      }`}
                    >
                      {twilioStatus.configured ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                      {twilioStatus.configured
                        ? "متغيرات Twilio مُعرَّفة بالكامل"
                        : `ناقص: ${twilioStatus.missing.join(", ")}`}
                    </div>
                  )}

                  <p className="text-[10px] text-slate-500">
                    تُضبط مفاتيح Twilio عبر متغيرات البيئة (.env.local محلياً، أو إعدادات Vercel في
                    الإنتاج) — وليس من هذه النافذة، للحفاظ على أمان الأسرار.
                  </p>

                  <button
                    onClick={handleTestWhatsApp}
                    disabled={isTesting || !twilioStatus?.configured}
                    className="w-full py-2 bg-slate-800 hover:bg-emerald-700 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                  >
                    {isTesting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                    Envoyer un test WhatsApp
                  </button>

                  {testResult && (
                    <p className={`text-[11px] text-center ${testResult.success ? "text-emerald-400" : "text-red-400"}`}>
                      {testResult.message}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
