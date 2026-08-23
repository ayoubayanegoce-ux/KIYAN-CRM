import type { ReactNode } from "react";
import { DollarSign, Flame, TrendingUp, LineChart, Trophy, FileText, Filter } from "lucide-react";
import type { CrmStats, FunnelStage, LeaderboardRow } from "@/lib/analytics";
import AiInsightCard from "./AiInsightCard";
import EmbedFormCard from "./EmbedFormCard";

const currency = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

export default function AnalyticsPanel({
  stats,
  orgId,
  appUrl,
  funnel,
  leaderboard,
}: {
  stats: CrmStats;
  orgId: string;
  appUrl: string;
  funnel: FunnelStage[];
  leaderboard: LeaderboardRow[];
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

      <FunnelChart stages={funnel} />
      <AiInsightCard />
      <LeaderboardTable rows={leaderboard} />
      <EmbedFormCard orgId={orgId} appUrl={appUrl} />
    </div>
  );
}

function FunnelChart({ stages }: { stages: FunnelStage[] }) {
  const maxCount = Math.max(1, ...stages.map((s) => s.count));

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-3">
      <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
        <Filter size={16} className="text-teal-400" /> مسار التحويل (Sales Funnel)
      </h3>

      <div className="space-y-2.5">
        {stages.map((stage) => {
          const widthPct = Math.max(4, (stage.count / maxCount) * 100);
          return (
            <div key={stage.key} className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-300">{stage.label}</span>
                <span className="flex items-center gap-2">
                  <span className="text-slate-200 font-mono">{stage.count}</span>
                  {stage.dropOffPct !== null && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                        stage.dropOffPct > 50
                          ? "bg-red-950 text-red-400"
                          : stage.dropOffPct > 20
                          ? "bg-amber-950 text-amber-400"
                          : "bg-emerald-950 text-emerald-400"
                      }`}
                    >
                      -{stage.dropOffPct.toFixed(0)}%
                    </span>
                  )}
                </span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-teal-600 rounded-full transition-all" style={{ width: `${widthPct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LeaderboardTable({ rows }: { rows: LeaderboardRow[] }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-3">
      <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
        <Trophy size={16} className="text-amber-400" /> صدارة المبيعات (Team Leaderboard)
      </h3>

      {rows.length === 0 ? (
        <p className="text-slate-500 text-sm text-center py-4">لا يوجد أعضاء أو عملاء موزَّعون بعد.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-right text-xs text-slate-500 border-b border-slate-800">
                <th className="pb-2 font-medium">العضو</th>
                <th className="pb-2 font-medium">عملاء متواصَل معهم</th>
                <th className="pb-2 font-medium">مواعيد محجوزة</th>
                <th className="pb-2 font-medium">قيمة الصفقات المغلقة</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.userId ?? "unassigned"} className="border-b border-slate-800/60 last:border-0">
                  <td className="py-2 text-slate-300 flex items-center gap-1.5">
                    {i === 0 && row.closedWonValue > 0 && <Trophy size={12} className="text-amber-400" />}
                    {row.name}
                  </td>
                  <td className="py-2 text-slate-400 font-mono">{row.contactedCount}</td>
                  <td className="py-2 text-slate-400 font-mono">{row.meetingsBookedCount}</td>
                  <td className="py-2 text-emerald-400 font-mono">{currency.format(row.closedWonValue)} €</td>
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
