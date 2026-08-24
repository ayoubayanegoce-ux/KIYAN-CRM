"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SignInButton, SignUpButton, useAuth } from "@clerk/nextjs";
import Link from "next/link";
import {
  Sparkles,
  Zap,
  Building2,
  LineChart,
  MessageCircle,
  Users2,
  CreditCard,
  Check,
  Loader2,
} from "lucide-react";
import { PLAN_DISPLAY, type PlanKey } from "@/lib/plans";

const FEATURES = [
  {
    icon: Sparkles,
    title: "تأهيل ذكي للعملاء",
    description: "تقييم فوري لكل عميل محتمل (0-100) وتصنيف Hot/Warm/Cold بالذكاء الاصطناعي.",
  },
  {
    icon: Building2,
    title: "إثراء بيانات الشركات",
    description: "تحليل تلقائي للقطاع، نموذج العمل، نقاط الألم، وفرص النمو لكل شركة عميل.",
  },
  {
    icon: Zap,
    title: "الطيار الآلي (Auto-Pilot)",
    description: "إرسال بريد تعريفي مخصَّص فوراً للعملاء المؤهَّلين دون تدخل يدوي.",
  },
  {
    icon: LineChart,
    title: "توقّع الإيرادات",
    description: "تتبّع خط المبيعات، احتمالية الفوز، والإيرادات المتوقعة في لوحة تحكم حيّة.",
  },
  {
    icon: MessageCircle,
    title: "تسلسلات متابعة متعددة اللغات",
    description: "3 رسائل متابعة مُولَّدة بالذكاء الاصطناعي، بلغة ونبرة تختارها أنت.",
  },
  {
    icon: Users2,
    title: "إدارة فريق كاملة",
    description: "تعيين العملاء لأعضاء الفريق، تتبّع التوزيع، وتقارير تنفيذية جاهزة للطباعة.",
  },
];

const FAQS = [
  {
    q: "هل أحتاج بطاقة ائتمان للبدء؟",
    a: "لا. يمكنك إنشاء حساب واستخدام الخطة المجانية مباشرة، والترقية لاحقاً وقتما تريد من الإعدادات.",
  },
  {
    q: "هل يمكنني إلغاء الاشتراك في أي وقت؟",
    a: "نعم — بدون التزام طويل الأمد. الاشتراك شهري ويُجدَّد يدوياً؛ يكفي ألا تُجدِّد الدفعة القادمة لتعود تلقائياً إلى الخطة المجانية.",
  },
  {
    q: "ما الفرق بين الخطط؟",
    a: "الفرق الأساسي هو الحد الشهري لاستدعاءات الذكاء الاصطناعي (تأهيل، إثراء، مراسلات). خطة Enterprise بلا حد أقصى.",
  },
  {
    q: "هل بياناتي معزولة عن باقي المستخدمين؟",
    a: "نعم بالكامل — كل منظمة (Organization) لها بياناتها وسياق الذكاء الاصطناعي الخاص بها، معزول تماماً عن باقي المستأجرين.",
  },
];

function PlanCard({ plan, highlighted }: { plan: Exclude<PlanKey, "free">; highlighted?: boolean }) {
  const { isSignedIn, orgId } = useAuth();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const info = PLAN_DISPLAY[plan];

  function handleSubscribe() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/youcanpay/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "فشل بدء الاشتراك");
        router.push(`/pay/${data.orderId}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "فشل بدء الاشتراك");
      }
    });
  }

  const featuresByPlan: Record<Exclude<PlanKey, "free">, string[]> = {
    starter: ["حتى 200 استدعاء ذكاء اصطناعي/شهر", "تأهيل وإثراء تلقائي للعملاء", "نموذج استقبال عام + تضمين"],
    pro: ["حتى 1000 استدعاء ذكاء اصطناعي/شهر", "الطيار الآلي والتسلسلات الذكية", "إدارة فريق وتوزيع عملاء", "تقارير تنفيذية"],
    enterprise: ["بلا حد أقصى لاستدعاءات الذكاء الاصطناعي", "علامة تجارية بيضاء كاملة", "دعم أولوية", "كل ميزات Pro"],
  };

  return (
    <div
      className={`rounded-xl p-6 space-y-4 border flex flex-col ${
        highlighted ? "bg-slate-900 border-blue-600 ring-1 ring-blue-600" : "bg-slate-900 border-slate-800"
      }`}
    >
      {highlighted && (
        <span className="self-start text-[10px] px-2 py-1 rounded-full bg-blue-600 text-white font-medium">
          الأكثر شيوعاً
        </span>
      )}
      <div>
        <h3 className="text-lg font-semibold text-slate-100">{info.name}</h3>
        <p className="text-3xl font-bold text-slate-100 mt-1">
          {info.priceMad} <span className="text-lg font-normal">MAD</span>
          <span className="text-sm font-normal text-slate-500">/شهر</span>
        </p>
      </div>
      <ul className="space-y-2 flex-1">
        {featuresByPlan[plan].map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-slate-400">
            <Check size={15} className="text-emerald-400 shrink-0 mt-0.5" /> {f}
          </li>
        ))}
      </ul>
      {isSignedIn && orgId ? (
        <button
          onClick={handleSubscribe}
          disabled={isPending}
          className={`w-full py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50 ${
            highlighted ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-slate-800 hover:bg-slate-700 text-slate-200"
          }`}
        >
          {isPending ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
          اشترك الآن
        </button>
      ) : (
        <SignUpButton mode="modal">
          <button
            className={`w-full py-2.5 rounded-lg text-sm font-medium transition cursor-pointer ${
              highlighted ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-slate-800 hover:bg-slate-700 text-slate-200"
            }`}
          >
            ابدأ الآن
          </button>
        </SignUpButton>
      )}
      {error && <p className="text-red-400 text-xs text-center">{error}</p>}
    </div>
  );
}

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <header className="max-w-6xl mx-auto flex justify-between items-center p-6">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🏢</span>
          <span className="text-lg font-bold tracking-wide">KIYAN CRM</span>
        </div>
        <div className="flex gap-3">
          <SignInButton mode="modal">
            <button className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition cursor-pointer">
              تسجيل الدخول
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition cursor-pointer">
              ابدأ مجاناً
            </button>
          </SignUpButton>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto text-center px-6 py-20 space-y-6">
        <span className="inline-block text-xs px-3 py-1 rounded-full bg-blue-950 text-blue-400 border border-blue-800 font-medium">
          CRM مدعوم بالذكاء الاصطناعي لفرق مبيعات B2B
        </span>
        <h1 className="text-4xl md:text-5xl font-bold leading-tight">
          أهّل عملاءك المحتملين، وأرسل رسائل تسويقية مخصَّصة،
          <br className="hidden md:block" /> كل ذلك تلقائياً بالذكاء الاصطناعي.
        </h1>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
          KIYAN CRM يقيّم عملاءك فور وصولهم، يُثري بيانات شركاتهم، ويرسل تسلسلات متابعة ذكية —
          فتركّز أنت على إغلاق الصفقات لا على العمل اليدوي.
        </p>
        <div className="flex justify-center gap-3">
          <SignUpButton mode="modal">
            <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition cursor-pointer">
              ابدأ مجاناً الآن
            </button>
          </SignUpButton>
          <a
            href="#pricing"
            className="px-6 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-sm font-medium transition cursor-pointer"
          >
            استعرض الأسعار
          </a>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-center mb-10">كل ما يحتاجه فريق مبيعاتك</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
              <f.icon size={22} className="text-blue-400" />
              <h3 className="font-semibold text-slate-100">{f.title}</h3>
              <p className="text-sm text-slate-400">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-center mb-2">خطط تناسب حجم فريقك</h2>
        <p className="text-slate-400 text-center mb-10">بدون التزام طويل الأمد — ألغِ أو غيّر خطتك في أي وقت.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <PlanCard plan="starter" />
          <PlanCard plan="pro" highlighted />
          <PlanCard plan="enterprise" />
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-center mb-10">الأسئلة الشائعة</h2>
        <div className="space-y-3">
          {FAQS.map((item) => (
            <details key={item.q} className="bg-slate-900 border border-slate-800 rounded-xl p-4 group">
              <summary className="cursor-pointer font-medium text-slate-200 list-none flex justify-between items-center">
                {item.q}
                <span className="text-slate-500 group-open:rotate-45 transition">+</span>
              </summary>
              <p className="text-sm text-slate-400 mt-3">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-800 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap justify-between items-center gap-4 text-sm text-slate-500">
          <span>© {new Date().getFullYear()} KIYAN CRM</span>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-slate-300 transition">
              الشروط والأحكام
            </Link>
            <Link href="/privacy" className="hover:text-slate-300 transition">
              سياسة الخصوصية
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
