import { auth } from "@clerk/nextjs/server";
import { SignInButton, SignUpButton, UserButton, OrganizationSwitcher } from "@clerk/nextjs";
import { ArrowRightLeft, PlusCircle, Download } from "lucide-react";
import { getLeads, addLead } from "./actions/leads";
import { getDeals, createDeal, convertLeadToDeal } from "./actions/deals";
import { computeCrmStats } from "@/lib/analytics";
import DashboardTabs from "./components/DashboardTabs";
import DealsKanban from "./components/DealsKanban";
import OutreachModal from "./components/OutreachModal";
import AnalyticsPanel from "./components/AnalyticsPanel";
import ImportLeadsButton from "./components/ImportLeadsButton";

export default async function Home() {
  const { userId, orgId } = await auth();
  const leads = orgId ? await getLeads() : [];
  const deals = orgId ? await getDeals() : [];
  const stats = computeCrmStats(leads, deals);

  const qualifiedIntents = ["hot", "warm"];

  const leadsContent = (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* نموذج إضافة عميل */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4 h-fit">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <span>➕</span> إضافة عميل محتمل
        </h2>
        <form action={addLead} className="space-y-3">
          <div>
            <label className="text-xs text-slate-400">الاسم</label>
            <input
              name="name"
              required
              className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg focus:outline-blue-500 text-sm"
              placeholder="أحمد علي"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400">البريد الإلكتروني</label>
            <input
              name="email"
              type="email"
              required
              className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg focus:outline-blue-500 text-sm"
              placeholder="ahmed@company.com"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400">اسم الشركة</label>
            <input
              name="company"
              className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg focus:outline-blue-500 text-sm"
              placeholder="شركة التقنية الحديثة"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 font-medium rounded-lg text-sm transition cursor-pointer"
          >
            حفظ وتقييم بالذكاء الاصطناعي 🤖
          </button>
        </form>
      </div>

      {/* قائمة العملاء */}
      <div className="md:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
        <div className="flex flex-wrap justify-between items-center gap-2">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span>📋</span> قائمة العملاء ({leads.length})
          </h2>
          <div className="flex items-center gap-2">
            <a
              href="/api/export/leads"
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-2"
            >
              <Download size={14} /> تصدير CSV
            </a>
            <ImportLeadsButton />
          </div>
        </div>

        {leads.length === 0 ? (
          <p className="text-slate-500 text-sm py-8 text-center">لا يوجد عملاء مضافون لهذه المنظمة بعد.</p>
        ) : (
          <div className="space-y-3">
            {leads.map((lead) => {
              const isQualified = qualifiedIntents.includes(lead.ai_intent);
              const isConverted = lead.status === "converted";
              const isContacted = lead.status === "contacted";

              return (
                <div
                  key={lead.id}
                  className="p-4 bg-slate-950 border border-slate-800/80 rounded-lg flex flex-wrap justify-between items-center gap-3"
                >
                  <div className="min-w-0">
                    <h3 className="font-medium text-slate-200 truncate">{lead.name}</h3>
                    <p className="text-xs text-slate-400 truncate">
                      {lead.email} {lead.company && `• ${lead.company}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 font-mono">
                      التقييم: <strong className="text-white">{lead.ai_score ?? 0}/100</strong>
                    </span>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        lead.ai_intent === "hot"
                          ? "bg-red-950 text-red-400 border border-red-800"
                          : lead.ai_intent === "warm"
                          ? "bg-amber-950 text-amber-400 border border-amber-800"
                          : "bg-slate-800 text-slate-400 border border-slate-700"
                      }`}
                    >
                      {lead.ai_intent ? lead.ai_intent.toUpperCase() : "COLD"}
                    </span>

                    <OutreachModal leadId={lead.id} leadName={lead.name} />

                    {isContacted && (
                      <span className="text-xs px-2.5 py-1.5 rounded-lg bg-sky-950 text-sky-400 border border-sky-800 font-medium">
                        Contactée ✉
                      </span>
                    )}

                    {isConverted ? (
                      <span className="text-xs px-2.5 py-1.5 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800 font-medium">
                        Convertie ✓
                      </span>
                    ) : isQualified ? (
                      <form action={convertLeadToDeal.bind(null, lead.id)}>
                        <button
                          type="submit"
                          title="Convertir en opportunité"
                          className="p-2 rounded-lg bg-slate-800 hover:bg-emerald-700 text-slate-300 hover:text-white transition cursor-pointer flex items-center gap-1.5 text-xs font-medium px-3"
                        >
                          <ArrowRightLeft size={14} /> Convertir
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  const pipelineContent = (
    <div className="space-y-6">
      <div className="flex justify-end">
        <a
          href="/api/export/deals"
          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-2"
        >
          <Download size={14} /> تصدير صفقات CSV
        </a>
      </div>

      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <form action={createDeal} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[160px]">
            <label className="text-xs text-slate-400">عنوان الصفقة</label>
            <input
              name="title"
              required
              className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg focus:outline-blue-500 text-sm"
              placeholder="عقد توريد سنوي"
            />
          </div>
          <div className="min-w-[160px]">
            <label className="text-xs text-slate-400">العميل (اختياري)</label>
            <select
              name="lead_id"
              className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg focus:outline-blue-500 text-sm"
              defaultValue=""
            >
              <option value="">بدون عميل</option>
              {leads.map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {lead.name}
                </option>
              ))}
            </select>
          </div>
          <div className="w-32">
            <label className="text-xs text-slate-400">القيمة (€)</label>
            <input
              name="value"
              type="number"
              min="0"
              step="1"
              defaultValue="0"
              className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg focus:outline-blue-500 text-sm"
            />
          </div>
          <button
            type="submit"
            className="py-2 px-4 bg-blue-600 hover:bg-blue-700 font-medium rounded-lg text-sm transition cursor-pointer flex items-center gap-2"
          >
            <PlusCircle size={15} /> إنشاء صفقة
          </button>
        </form>
      </div>

      <DealsKanban deals={deals} />
    </div>
  );

  const analyticsContent = <AnalyticsPanel stats={stats} />;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* شريط التنقل العلوي */}
        <header className="flex justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏢</span>
            <h1 className="text-xl font-bold tracking-wide">B2B CRM AI</h1>
          </div>

          {!userId ? (
            <div className="flex gap-3">
              <SignInButton mode="modal">
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition cursor-pointer">
                  تسجيل الدخول
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium transition cursor-pointer">
                  حساب جديد
                </button>
              </SignUpButton>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <OrganizationSwitcher afterCreateOrganizationUrl="/" afterSelectOrganizationUrl="/" />
              <UserButton />
            </div>
          )}
        </header>

        {/* مساحة العمل بعد تسجيل الدخول */}
        {userId && (
          <>
            {!orgId ? (
              <div className="p-8 text-center bg-slate-900/60 border border-amber-500/30 rounded-xl">
                <p className="text-amber-400 font-medium">
                  ⚠️ يُرجى تحديد أو إنشاء منظمة من الأعلى لعرض بيانات الـ CRM.
                </p>
              </div>
            ) : (
              <DashboardTabs
                leadsContent={leadsContent}
                pipelineContent={pipelineContent}
                analyticsContent={analyticsContent}
              />
            )}
          </>
        )}
      </div>
    </main>
  );
}
