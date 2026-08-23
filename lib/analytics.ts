export type DealLike = {
  deal_value: number | string | null;
  stage: string | null;
  win_probability?: number | string | null;
  leads?: { assignee_id?: string | null; assignee_name?: string | null } | null;
};

export type LeadLike = {
  ai_intent: string | null;
  status: string | null;
  assignee_id?: string | null;
  assignee_name?: string | null;
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

export type TeamDistributionRow = {
  userId: string | null;
  name: string;
  leadsCount: number;
  dealsCount: number;
};

const UNASSIGNED_LABEL = "غير معيّن";

/**
 * توزيع العملاء والصفقات على أعضاء الفريق. الصفقات لا تحمل تعييناً خاصاً بها،
 * بل تُنسَب لتعيين العميل المرتبطة به (leads.assignee_*) — تفادياً لإضافة عمود
 * تعيين مكرَّر على جدول الصفقات. الأعضاء بدون أي عميل/صفقة يظهرون بصفر أيضاً
 * (حتى يرى المدير من لا يزال بلا عمل موزَّع عليه).
 */
export function computeTeamDistribution(
  leads: LeadLike[],
  deals: DealLike[],
  members: { userId: string; name: string }[]
): TeamDistributionRow[] {
  const rows = new Map<string, TeamDistributionRow>();

  for (const member of members) {
    rows.set(member.userId, { userId: member.userId, name: member.name, leadsCount: 0, dealsCount: 0 });
  }

  let unassignedLeads = 0;
  for (const lead of leads) {
    if (!lead.assignee_id) {
      unassignedLeads += 1;
      continue;
    }
    const row = rows.get(lead.assignee_id);
    if (row) {
      row.leadsCount += 1;
    } else {
      rows.set(lead.assignee_id, {
        userId: lead.assignee_id,
        name: lead.assignee_name || "عضو سابق",
        leadsCount: 1,
        dealsCount: 0,
      });
    }
  }

  let unassignedDeals = 0;
  for (const deal of deals) {
    const assigneeId = deal.leads?.assignee_id;
    if (!assigneeId) {
      unassignedDeals += 1;
      continue;
    }
    const row = rows.get(assigneeId);
    if (row) {
      row.dealsCount += 1;
    } else {
      rows.set(assigneeId, {
        userId: assigneeId,
        name: deal.leads?.assignee_name || "عضو سابق",
        leadsCount: 0,
        dealsCount: 1,
      });
    }
  }

  const result = Array.from(rows.values()).sort((a, b) => b.leadsCount + b.dealsCount - (a.leadsCount + a.dealsCount));

  if (unassignedLeads > 0 || unassignedDeals > 0) {
    result.push({
      userId: null,
      name: UNASSIGNED_LABEL,
      leadsCount: unassignedLeads,
      dealsCount: unassignedDeals,
    });
  }

  return result;
}

export type FunnelStage = {
  key: string;
  label: string;
  count: number;
  /** null للمرحلة الأولى فقط (لا توجد مرحلة سابقة تُقاس نسبة التسرّب منها). */
  dropOffPct: number | null;
};

const MEETING_OR_BEYOND_STAGES = ["meeting_scheduled", "proposal", "negotiation", "won"];
const PROPOSAL_OR_BEYOND_STAGES = ["proposal", "negotiation", "won"];

/**
 * مسار تحويل مركّب من مصدرين: "Leads" و"Contacted" من جدول العملاء مباشرة
 * (حالة العميل)، والباقي من مراحل الصفقة الفعلية — لأن "حجز موعد" و"عرض سعر"
 * و"إغلاق مربوح" مفاهيم صفقة، لا عميل. هذا يعني أن الأرقام تقريبية وليست
 * تتبّعاً حرفياً لكل عميل عبر مراحل موحّدة، لكنها تعكس واقع البيانات الحالية
 * دون الحاجة لعمود تتبّع إضافي جديد.
 */
export function computeFunnel(leads: LeadLike[], deals: DealLike[]): FunnelStage[] {
  const stagesRaw = [
    { key: "leads", label: "Leads", count: leads.length },
    { key: "contacted", label: "Contacted", count: leads.filter((l) => l.status && l.status !== "new").length },
    {
      key: "meeting",
      label: "Meeting Scheduled",
      count: deals.filter((d) => MEETING_OR_BEYOND_STAGES.includes(d.stage || "")).length,
    },
    {
      key: "proposal",
      label: "Proposal",
      count: deals.filter((d) => PROPOSAL_OR_BEYOND_STAGES.includes(d.stage || "")).length,
    },
    { key: "won", label: "Closed Won", count: deals.filter((d) => d.stage === "won").length },
  ];

  return stagesRaw.map((stage, idx) => {
    if (idx === 0) return { ...stage, dropOffPct: null };
    const prevCount = stagesRaw[idx - 1].count;
    const dropOffPct = prevCount > 0 ? ((prevCount - stage.count) / prevCount) * 100 : 0;
    return { ...stage, dropOffPct };
  });
}

export type LeaderboardRow = {
  userId: string | null;
  name: string;
  contactedCount: number;
  meetingsBookedCount: number;
  closedWonValue: number;
};

/** صدارة المبيعات: عملاء تم التواصل معهم، مواعيد محجوزة، وقيمة الصفقات المغلقة لكل عضو — مُرتَّبة تنازلياً حسب القيمة المغلقة. */
export function computeLeaderboard(
  leads: LeadLike[],
  deals: DealLike[],
  members: { userId: string; name: string }[]
): LeaderboardRow[] {
  const rows = new Map<string, LeaderboardRow>();

  for (const member of members) {
    rows.set(member.userId, { userId: member.userId, name: member.name, contactedCount: 0, meetingsBookedCount: 0, closedWonValue: 0 });
  }

  for (const lead of leads) {
    if (!lead.assignee_id || !lead.status || lead.status === "new") continue;
    const row = rows.get(lead.assignee_id);
    if (row) {
      row.contactedCount += 1;
    } else {
      rows.set(lead.assignee_id, {
        userId: lead.assignee_id,
        name: lead.assignee_name || "عضو سابق",
        contactedCount: 1,
        meetingsBookedCount: 0,
        closedWonValue: 0,
      });
    }
  }

  for (const deal of deals) {
    const assigneeId = deal.leads?.assignee_id;
    if (!assigneeId) continue;
    const isMeetingOrBeyond = MEETING_OR_BEYOND_STAGES.includes(deal.stage || "");
    const wonValue = deal.stage === "won" ? Number(deal.deal_value) || 0 : 0;

    const row = rows.get(assigneeId);
    if (row) {
      if (isMeetingOrBeyond) row.meetingsBookedCount += 1;
      row.closedWonValue += wonValue;
    } else {
      rows.set(assigneeId, {
        userId: assigneeId,
        name: deal.leads?.assignee_name || "عضو سابق",
        contactedCount: 0,
        meetingsBookedCount: isMeetingOrBeyond ? 1 : 0,
        closedWonValue: wonValue,
      });
    }
  }

  return Array.from(rows.values()).sort((a, b) => b.closedWonValue - a.closedWonValue);
}
