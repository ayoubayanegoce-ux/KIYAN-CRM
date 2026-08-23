"use client";

import { useState, useTransition } from "react";
import {
  Settings,
  X,
  Loader2,
  Save,
  Check,
  Link2,
  Bell,
  Send,
  Palette,
  CreditCard,
  ExternalLink,
} from "lucide-react";
import {
  getAISettings,
  setAISettings,
  getTelegramSettings,
  setTelegramSettings,
  sendTestTelegram,
  getBranding,
  setBranding,
  getSubscriptionInfo,
  type AITone,
  type AILanguage,
  type TelegramSettings,
  type BrandingSettings,
  type SubscriptionInfo,
} from "@/app/actions/settings";
import { PLAN_DISPLAY } from "@/lib/plans";

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

  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [telegramBotToken, setTelegramBotToken] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [isSavingTelegram, startTelegramSaveTransition] = useTransition();
  const [telegramSaved, setTelegramSaved] = useState(false);
  const [isTesting, startTestTransition] = useTransition();
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [orgDisplayName, setOrgDisplayName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [brandColor, setBrandColor] = useState("");
  const [isSavingBrand, startBrandTransition] = useTransition();
  const [brandSaved, setBrandSaved] = useState(false);
  const [brandError, setBrandError] = useState<string | null>(null);

  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [isOpeningPortal, startPortalTransition] = useTransition();

  function load() {
    setError(null);
    startLoadTransition(async () => {
      try {
        const [settings, telegram, branding, sub] = await Promise.all([
          getAISettings(),
          getTelegramSettings(),
          getBranding(),
          getSubscriptionInfo(),
        ]);
        setTone(settings.tone);
        setLanguage(settings.language);
        setValueProposition(settings.valueProposition);
        setBookingUrl(settings.bookingUrl);
        setTelegramEnabled(telegram.enabled);
        setTelegramBotToken(telegram.botToken);
        setTelegramChatId(telegram.chatId);
        setOrgDisplayName(branding.orgDisplayName);
        setLogoUrl(branding.logoUrl);
        setBrandColor(branding.brandColor);
        setSubscription(sub);
        setLoaded(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "فشل تحميل الإعدادات");
      }
    });
  }

  function handleSaveTelegram() {
    setTestResult(null);
    startTelegramSaveTransition(async () => {
      try {
        const settings: TelegramSettings = { enabled: telegramEnabled, botToken: telegramBotToken, chatId: telegramChatId };
        await setTelegramSettings(settings);
        setTelegramSaved(true);
        setTimeout(() => setTelegramSaved(false), 2000);
      } catch (e) {
        setTestResult({ success: false, message: e instanceof Error ? e.message : "فشل حفظ إعدادات Telegram" });
      }
    });
  }

  function handleSaveBranding() {
    setBrandError(null);
    setBrandSaved(false);
    startBrandTransition(async () => {
      try {
        const settings: BrandingSettings = { orgDisplayName, logoUrl, brandColor };
        await setBranding(settings);
        setBrandSaved(true);
        setTimeout(() => setBrandSaved(false), 2000);
      } catch (e) {
        setBrandError(e instanceof Error ? e.message : "فشل حفظ العلامة التجارية");
      }
    });
  }

  function handleManageBilling() {
    startPortalTransition(async () => {
      try {
        const res = await fetch("/api/stripe/portal", { method: "POST" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "فشل فتح بوابة الفوترة");
        window.open(data.url, "_blank", "noopener,noreferrer");
      } catch (e) {
        setBrandError(e instanceof Error ? e.message : "فشل فتح بوابة الفوترة");
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

  function handleTestTelegram() {
    setTestResult(null);
    startTestTransition(async () => {
      try {
        const result = await sendTestTelegram();
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
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                      <Bell size={13} /> إشعارات الهاتف اللحظية (Instant Mobile Alerts)
                    </p>
                    <button
                      onClick={() => setTelegramEnabled((v) => !v)}
                      title="تفعيل إشعارات Telegram"
                      className={`relative w-9 h-5 rounded-full transition cursor-pointer shrink-0 ${
                        telegramEnabled ? "bg-blue-600" : "bg-slate-700"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${
                          telegramEnabled ? "right-0.5" : "left-0.5"
                        }`}
                      />
                    </button>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-500 mb-1 block">Telegram Bot Token</label>
                    <input
                      value={telegramBotToken}
                      onChange={(e) => setTelegramBotToken(e.target.value)}
                      placeholder="123456789:AAExxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono focus:outline-blue-500"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      أنشئ بوتاً واحصل على التوكن من <span className="font-mono text-slate-400">@BotFather</span> على
                      تيليجرام.
                    </p>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-500 mb-1 block">Telegram Chat ID</label>
                    <input
                      value={telegramChatId}
                      onChange={(e) => setTelegramChatId(e.target.value)}
                      placeholder="123456789"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono focus:outline-blue-500"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      راسل <span className="font-mono text-slate-400">@userinfobot</span> على تيليجرام للحصول على
                      معرّف محادثتك.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveTelegram}
                      disabled={isSavingTelegram}
                      className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                    >
                      {isSavingTelegram ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : telegramSaved ? (
                        <Check size={13} />
                      ) : (
                        <Save size={13} />
                      )}
                      {telegramSaved ? "تم الحفظ" : "حفظ"}
                    </button>
                    <button
                      onClick={handleTestTelegram}
                      disabled={isTesting || !telegramBotToken.trim() || !telegramChatId.trim()}
                      className="flex-1 py-2 bg-slate-800 hover:bg-blue-700 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                    >
                      {isTesting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                      رسالة تجريبية
                    </button>
                  </div>

                  {testResult && (
                    <p className={`text-[11px] text-center ${testResult.success ? "text-emerald-400" : "text-red-400"}`}>
                      {testResult.message}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                    <Palette size={13} /> العلامة التجارية (White-Label)
                  </p>
                  <div>
                    <label className="text-[11px] text-slate-500 mb-1 block">اسم المنظمة المعروض</label>
                    <input
                      value={orgDisplayName}
                      onChange={(e) => setOrgDisplayName(e.target.value)}
                      placeholder="KIYAN Solutions"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm focus:outline-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 mb-1 block">رابط الشعار (Logo URL)</label>
                    <input
                      type="url"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      placeholder="https://example.com/logo.png"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm focus:outline-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 mb-1 block">اللون الرئيسي (hex)</label>
                    <div className="flex items-center gap-2">
                      <input
                        value={brandColor}
                        onChange={(e) => setBrandColor(e.target.value)}
                        placeholder="#2563eb"
                        className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm focus:outline-blue-500 font-mono"
                      />
                      {/^#[0-9a-fA-F]{6}$/.test(brandColor) && (
                        <span
                          className="w-8 h-8 rounded-lg border border-slate-700 shrink-0"
                          style={{ backgroundColor: brandColor }}
                        />
                      )}
                    </div>
                  </div>
                  <button
                    onClick={handleSaveBranding}
                    disabled={isSavingBrand}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                  >
                    {isSavingBrand ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : brandSaved ? (
                      <Check size={13} />
                    ) : (
                      <Save size={13} />
                    )}
                    {brandSaved ? "تم الحفظ" : "حفظ العلامة التجارية"}
                  </button>
                  {brandError && <p className="text-red-400 text-[11px] text-center">{brandError}</p>}
                </div>

                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                    <CreditCard size={13} /> الاشتراك والفوترة
                  </p>
                  {subscription && (
                    <>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">الخطة الحالية</span>
                        <span className="text-slate-200 font-medium">
                          {PLAN_DISPLAY[subscription.plan].name}
                          {subscription.plan !== "free" && ` — $${PLAN_DISPLAY[subscription.plan].priceUsd}/mo`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">استخدام الذكاء الاصطناعي هذا الشهر</span>
                        <span className="text-slate-200 font-mono">
                          {subscription.aiUsageCount}
                          {subscription.aiMonthlyQuota > 0 ? ` / ${subscription.aiMonthlyQuota}` : " (بلا حد أقصى)"}
                        </span>
                      </div>
                      {subscription.hasStripeCustomer && (
                        <button
                          onClick={handleManageBilling}
                          disabled={isOpeningPortal}
                          className="w-full py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                        >
                          {isOpeningPortal ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <ExternalLink size={13} />
                          )}
                          إدارة الفواتير وبطاقة الدفع
                        </button>
                      )}
                    </>
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
