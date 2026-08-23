import type { ReactNode } from "react";
import { DollarSign, Flame, TrendingUp, LineChart } from "lucide-react";
import type { CrmStats } from "@/lib/analytics";
import AiInsightCard from "./AiInsightCard";
import EmbedFormCard from "./EmbedFormCard";

const currency = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

export default function AnalyticsPanel({
  stats,
  orgId,
  appUrl,
}: {
  stats: CrmStats;
  orgId: string;
  appUrl: string;
}) {
  return (
    <div className="space-y-6">
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
      <EmbedFormCard orgId={orgId} appUrl={appUrl} />
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
