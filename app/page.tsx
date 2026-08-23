import { auth } from "@clerk/nextjs/server";
import { SignInButton, SignUpButton, UserButton, OrganizationSwitcher } from "@clerk/nextjs";
import { PlusCircle, Download } from "lucide-react";
import { getLeads, addLead } from "./actions/leads";
import { getDeals, createDeal } from "./actions/deals";
import { getAutopilotSetting } from "./actions/settings";
import { computeCrmStats } from "@/lib/analytics";
import { getAppUrl } from "@/lib/appUrl";
import DashboardTabs from "./components/DashboardTabs";
import DealsKanban from "./components/DealsKanban";
import LeadsList from "./components/LeadsList";
import AnalyticsPanel from "./components/AnalyticsPanel";
import AutoPilotToggle from "./components/AutoPilotToggle";
import SettingsModal from "./components/SettingsModal";

export default async function Home() {
  const { userId, orgId } = await auth();
  const leads = orgId ? await getLeads() : [];
  const deals = orgId ? await getDeals() : [];
  const autopilotEnabled = orgId ? await getAutopilotSetting() : false;
  const appUrl = orgId ? await getAppUrl() : "";
  const stats = computeCrmStats(leads, deals);

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

      {orgId && <LeadsList orgId={orgId} initialLeads={leads} />}
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

      {orgId && <DealsKanban deals={deals} orgId={orgId} />}
    </div>
  );

  const analyticsContent = orgId ? (
    <AnalyticsPanel stats={stats} orgId={orgId} appUrl={appUrl} />
  ) : null;

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
              {orgId && (
                <div className="flex items-center gap-2" key={orgId}>
                  <AutoPilotToggle initialEnabled={autopilotEnabled} />
                  <SettingsModal />
                </div>
              )}
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
                key={orgId}
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
