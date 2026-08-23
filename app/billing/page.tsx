import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { ArrowRight, CreditCard, Users2 } from "lucide-react";
import { getSubscriptionInfo } from "@/app/actions/settings";
import { getLeads } from "@/app/actions/leads";
import { getDeals } from "@/app/actions/deals";
import { getOrgMembers } from "@/lib/team";
import { computeTeamDistribution } from "@/lib/analytics";
import { getStripeClient } from "@/lib/stripe";
import { PLAN_DISPLAY, type PlanKey } from "@/lib/plans";
import BillingPricingCards from "./BillingPricingCards";
import ManageBillingButton from "./ManageBillingButton";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });

const STATUS_LABELS_AR: Record<string, string> = {
  active: "نشط",
  trialing: "فترة تجريبية",
  inactive: "غير مفعَّل (Free)",
  cancelled: "مُلغى",
  past_due: "متأخر الدفع",
  unpaid: "غير مدفوع",
};

async function getRenewalDate(subscriptionId: string | null): Promise<Date | null> {
  if (!subscriptionId) return null;
  const stripe = getStripeClient();
  if (!stripe) return null;

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const periodEnd = subscription.items.data[0]?.current_period_end;
    return periodEnd ? new Date(periodEnd * 1000) : null;
  } catch (error) {
    console.error("Error fetching subscription renewal date:", error);
    return null;
  }
}

export default async function BillingPage() {
  const { orgId } = await auth();

  if (!orgId) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <p className="text-amber-400">يجب اختيار منظمة أولاً لعرض الفوترة والاشتراكات.</p>
      </main>
    );
  }

  const [subscription, leads, deals, members] = await Promise.all([
    getSubscriptionInfo(),
    getLeads(),
    getDeals(),
    getOrgMembers(orgId),
  ]);

  const renewalDate = await getRenewalDate(subscription.stripeSubscriptionId);
  const teamDistribution = computeTeamDistribution(leads, deals, members);
  const usagePct = subscription.aiMonthlyQuota > 0 ? Math.min(100, (subscription.aiUsageCount / subscription.aiMonthlyQuota) * 100) : 0;
  const barColor = usagePct > 90 ? "bg-red-500" : usagePct > 70 ? "bg-amber-500" : "bg-emerald-500";
  const planName = PLAN_DISPLAY[subscription.plan as PlanKey]?.name ?? "Free Trial";

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        <Link href="/" className="text-sm text-blue-400 hover:text-blue-300 transition inline-flex items-center gap-1.5">
          <ArrowRight size={14} /> العودة إلى لوحة التحكم
        </Link>

        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <CreditCard size={20} className="text-blue-400" /> الفوترة والاشتراكات
          </h1>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1.5 rounded-full bg-blue-950 text-blue-400 border border-blue-800 text-sm font-semibold">
                {planName}
              </span>
              <span className="text-xs text-slate-400">
                الحالة: {STATUS_LABELS_AR[subscription.subscriptionStatus] ?? subscription.subscriptionStatus}
              </span>
            </div>
            {subscription.hasStripeCustomer && <ManageBillingButton />}
          </div>

          {renewalDate && (
            <p className="text-xs text-slate-500">تاريخ التجديد القادم: {dateFormatter.format(renewalDate)}</p>
          )}

          <div className="space-y-1.5 pt-2 border-t border-slate-800">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">استهلاك الرصيد الشهري للذكاء الاصطناعي</span>
              <span className="text-slate-200 font-mono">
                {subscription.aiUsageCount}
                {subscription.aiMonthlyQuota > 0 ? ` / ${subscription.aiMonthlyQuota}` : " (بلا حد أقصى)"}
              </span>
            </div>
            {subscription.aiMonthlyQuota > 0 && (
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${usagePct}%` }} />
              </div>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">الخطط والترقية</h2>
          <BillingPricingCards currentPlan={subscription.plan as PlanKey} />
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-3">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Users2 size={16} className="text-indigo-400" /> استخدام الفريق
          </h3>
          {teamDistribution.length === 0 ? (
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
                  {teamDistribution.map((row) => (
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
      </div>
    </main>
  );
}
