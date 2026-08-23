import type { ReactNode } from "react";
import { DollarSign, Flame, TrendingUp, LineChart, Users, FileText } from "lucide-react";
import type { CrmStats, TeamDistributionRow } from "@/lib/analytics";
import AiInsightCard from "./AiInsightCard";
import EmbedFormCard from "./EmbedFormCard";

const currency = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

export default function AnalyticsPanel({
  stats,
  orgId,
  appUrl,
  teamDistribution,
}: {
  stats: CrmStats;
  orgId: string;
  appUrl: string;
  teamDistribution: TeamDistributionRow[];
}) {
  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <a
          href="/reports/summary"
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-2"
        >
          <FileText size={14} /> تحميل الملخص التنفيذي
        </a>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<DollarSign size={18} />}
          label="إجمالي قيمة الصفقات (Pipeline Value)"
          value={`${currency.format(stats.totalPipelineValue)} €`}
          accent="text-emerald-400"
        />
        <StatCard
          icon={<LineChart size={18} />}
          label="الإيرادات المتوقعة (Forecasted Revenue)"
          value={`${currency.format(stats.forecastedRevenue)} €`}
          accent="text-amber-400"
        />
        <StatCard
          icon={<Flame size={18} />}
          label="عملاء بتصنيف HOT"
          value={String(stats.hotLeadsCount)}
          accent="text-red-400"
        />
        <StatCard
          icon={<TrendingUp size={18} />}
          label="نسبة التحويل (Conversion Rate)"
          value={`${stats.conversionRate.toFixed(1)}%`}
          accent="text-blue-400"
        />
      </div>

      <AiInsightCard />
      <TeamDistributionCard rows={teamDistribution} />
      <EmbedFormCard orgId={orgId} appUrl={appUrl} />
    </div>
  );
}

function TeamDistributionCard({ rows }: { rows: TeamDistributionRow[] }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-3">
      <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
        <Users size={16} className="text-indigo-400" /> توزيع الفريق
      </h3>

      {rows.length === 0 ? (
        <p className="text-slate-500 text-sm text-center py-4">لا يوجد أعضاء أو عملاء موزَّعون بعد.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-right text-xs text-slate-500 border-b border-slate-800">
                <th className="pb-2 font-medium">العضو</th>
                <th className="pb-2 font-medium">العملاء</th>
                <th className="pb-2 font-medium">الصفقات</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.userId ?? "unassigned"} className="border-b border-slate-800/60 last:border-0">
                  <td className="py-2 text-slate-300">{row.name}</td>
                  <td className="py-2 text-slate-400 font-mono">{row.leadsCount}</td>
                  <td className="py-2 text-slate-400 font-mono">{row.dealsCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
      <div className={`flex items-center gap-2 ${accent}`}>
        {icon}
        <span className="text-xs text-slate-400">{label}</span>
      </div>
      <p className="text-2xl font-bold text-slate-100">{value}</p>
    </div>
  );
}
