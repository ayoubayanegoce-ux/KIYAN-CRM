import { auth } from "@clerk/nextjs/server";
import { getLeads } from "@/app/actions/leads";
import { getDeals } from "@/app/actions/deals";
import { computeCrmStats, computeTeamDistribution } from "@/lib/analytics";
import { getOrgMembers } from "@/lib/team";
import PrintButton from "./PrintButton";

const currency = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const dateFormatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });

export default async function ExecutiveSummaryPage() {
  const { orgId } = await auth();

  if (!orgId) {
    return (
      <main className="min-h-screen bg-white text-slate-900 flex items-center justify-center p-6">
        <p className="text-slate-600">يجب اختيار منظمة لعرض الملخص التنفيذي.</p>
      </main>
    );
  }

  const [leads, deals, members] = await Promise.all([getLeads(), getDeals(), getOrgMembers(orgId)]);
  const stats = computeCrmStats(leads, deals);
  const teamDistribution = computeTeamDistribution(leads, deals, members);

  const kpis = [
    { label: "إجمالي قيمة الصفقات (Pipeline Value)", value: `${currency.format(stats.totalPipelineValue)} €` },
    { label: "الإيرادات المتوقعة (Forecasted Revenue)", value: `${currency.format(stats.forecastedRevenue)} €` },
    { label: "متوسط قيمة الصفقة", value: `${currency.format(stats.averageDealValue)} €` },
    { label: "نسبة التحويل (Conversion Rate)", value: `${stats.conversionRate.toFixed(1)}%` },
    { label: "إجمالي العملاء", value: String(stats.totalLeadsCount) },
    { label: "عملاء بتصنيف HOT", value: String(stats.hotLeadsCount) },
    { label: "إجمالي الصفقات", value: String(stats.totalDealsCount) },
    { label: "الصفقات المربوحة", value: String(stats.wonDealsCount) },
  ];

  return (
    <main className="min-h-screen bg-white text-slate-900 p-8 print:p-0">
      <div className="max-w-3xl mx-auto space-y-8 print:max-w-none">
        <div className="flex justify-between items-start border-b border-slate-200 pb-6">
          <div>
            <h1 className="text-2xl font-bold">KIYAN CRM — الملخص التنفيذي</h1>
            <p className="text-sm text-slate-500 mt-1">{dateFormatter.format(new Date())}</p>
          </div>
          <PrintButton />
        </div>

        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            مؤشرات الأداء الأساسية (KPIs)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {kpis.map((kpi) => (
              <div key={kpi.label} className="border border-slate-200 rounded-lg p-4">
                <p className="text-xs text-slate-500">{kpi.label}</p>
                <p className="text-xl font-bold mt-1">{kpi.value}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            توزيع الصفقات حسب المرحلة
          </h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-right border-b border-slate-300">
                <th className="py-2 font-medium">المرحلة</th>
                <th className="py-2 font-medium">عدد الصفقات</th>
                <th className="py-2 font-medium">القيمة الإجمالية</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(stats.dealsByStage).map(([stage, data]) => (
                <tr key={stage} className="border-b border-slate-100">
                  <td className="py-2 capitalize">{stage}</td>
                  <td className="py-2">{data.count}</td>
                  <td className="py-2">{currency.format(data.value)} €</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">توزيع الفريق</h2>
          {teamDistribution.length === 0 ? (
            <p className="text-sm text-slate-500">لا يوجد أعضاء أو عملاء موزَّعون بعد.</p>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-right border-b border-slate-300">
                  <th className="py-2 font-medium">العضو</th>
                  <th className="py-2 font-medium">العملاء</th>
                  <th className="py-2 font-medium">الصفقات</th>
                </tr>
              </thead>
              <tbody>
                {teamDistribution.map((row) => (
                  <tr key={row.userId ?? "unassigned"} className="border-b border-slate-100">
                    <td className="py-2">{row.name}</td>
                    <td className="py-2">{row.leadsCount}</td>
                    <td className="py-2">{row.dealsCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <p className="text-[10px] text-slate-400 pt-4 border-t border-slate-200">
          تقرير مولَّد تلقائياً من KIYAN CRM — البيانات لحظة التوليد وقد تتغيّر لاحقاً.
        </p>
      </div>
    </main>
  );
}
