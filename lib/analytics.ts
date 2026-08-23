export type DealLike = {
  deal_value: number | string | null;
  stage: string | null;
  win_probability?: number | string | null;
};

export type LeadLike = {
  ai_intent: string | null;
  status: string | null;
};

export type CrmStats = {
  totalPipelineValue: number;
  totalDealsCount: number;
  wonDealsCount: number;
  lostDealsCount: number;
  hotLeadsCount: number;
  totalLeadsCount: number;
  conversionRate: number;
  averageDealValue: number;
  forecastedRevenue: number;
  dealsByStage: Record<string, { count: number; value: number }>;
};

const DEFAULT_WIN_PROBABILITY = 50;

export function computeCrmStats(leads: LeadLike[], deals: DealLike[]): CrmStats {
  const totalLeadsCount = leads.length;
  const hotLeadsCount = leads.filter((l) => l.ai_intent === "hot").length;

  const totalDealsCount = deals.length;
  const wonDealsCount = deals.filter((d) => d.stage === "won").length;
  const lostDealsCount = deals.filter((d) => d.stage === "lost").length;

  const totalPipelineValue = deals
    .filter((d) => d.stage !== "lost")
    .reduce((sum, d) => sum + (Number(d.deal_value) || 0), 0);

  const totalDealsValue = deals.reduce((sum, d) => sum + (Number(d.deal_value) || 0), 0);
  const averageDealValue = totalDealsCount > 0 ? totalDealsValue / totalDealsCount : 0;
  const conversionRate = totalDealsCount > 0 ? (wonDealsCount / totalDealsCount) * 100 : 0;

  // الإيرادات المتوقعة: مجموع (قيمة الصفقة × احتمال الفوز) للصفقات المفتوحة فقط
  // (بدون المربوحة/الخاسرة أصلاً، لأنها نتائج فعلية وليست توقعات).
  const forecastedRevenue = deals
    .filter((d) => d.stage !== "won" && d.stage !== "lost")
    .reduce((sum, d) => {
      const dealValue = Number(d.deal_value) || 0;
      const probability = d.win_probability != null ? Number(d.win_probability) : DEFAULT_WIN_PROBABILITY;
      return sum + dealValue * (probability / 100);
    }, 0);

  const dealsByStage: Record<string, { count: number; value: number }> = {};
  for (const d of deals) {
    const key = d.stage || "unknown";
    if (!dealsByStage[key]) dealsByStage[key] = { count: 0, value: 0 };
    dealsByStage[key].count += 1;
    dealsByStage[key].value += Number(d.deal_value) || 0;
  }

  return {
    totalPipelineValue,
    totalDealsCount,
    wonDealsCount,
    lostDealsCount,
    hotLeadsCount,
    totalLeadsCount,
    conversionRate,
    averageDealValue,
    forecastedRevenue,
    dealsByStage,
  };
}
