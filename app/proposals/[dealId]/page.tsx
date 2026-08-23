import { supabase } from "@/lib/supabase";
import PrintButton from "@/app/reports/summary/PrintButton";
import AcceptProposalForm from "./AcceptProposalForm";
import type { DealProposal } from "@/app/actions/deals";

const currency = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const dateFormatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });

/**
 * صفحة عامة غير محمية بالتصميم — نفس منطق app/forms/[orgId]: رابط الصفقة
 * نفسه هو "المفتاح" الذي يُشارَك مع العميل. لا Clerk auth() هنا عمداً.
 */
export default async function ProposalPage({ params }: { params: Promise<{ dealId: string }> }) {
  const { dealId } = await params;

  const { data: deal } = await supabase
    .from("deals")
    .select("id, org_id, title, deal_value, stripe_checkout_url, proposal, leads(name, company)")
    .eq("id", dealId)
    .maybeSingle();

  if (!deal || !deal.proposal) {
    return (
      <main className="min-h-screen bg-white text-slate-900 flex items-center justify-center p-6">
        <p className="text-slate-600">هذا العرض غير متوفر.</p>
      </main>
    );
  }

  const { data: branding } = await supabase
    .from("org_settings")
    .select("org_display_name, logo_url")
    .eq("org_id", deal.org_id)
    .maybeSingle();

  const proposal = deal.proposal as DealProposal;
  const lead = Array.isArray(deal.leads) ? deal.leads[0] : deal.leads;
  const total = proposal.items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const generatedDate = new Date(proposal.generatedAt);
  const expiryDate = new Date(generatedDate);
  expiryDate.setDate(expiryDate.getDate() + (proposal.validityDays || 15));

  return (
    <main className="min-h-screen bg-white text-slate-900 p-8 print:p-0">
      <div className="max-w-2xl mx-auto space-y-8 print:max-w-none">
        <div className="flex justify-between items-start border-b border-slate-200 pb-6">
          <div className="flex items-center gap-3">
            {branding?.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={branding.logo_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
            )}
            <div>
              <h1 className="text-xl font-bold">{branding?.org_display_name || "KIYAN CRM"}</h1>
              <p className="text-sm text-slate-500 mt-0.5">عرض سعر تجاري (Devis)</p>
            </div>
          </div>
          <PrintButton />
        </div>

        <div>
          <h2 className="text-2xl font-bold">{deal.title}</h2>
          {lead?.name && (
            <p className="text-sm text-slate-500 mt-1">
              مُعَدّ لـ: {lead.name}
              {lead.company ? ` — ${lead.company}` : ""}
            </p>
          )}
          <p className="text-xs text-slate-400 mt-1">
            تاريخ الإصدار: {dateFormatter.format(generatedDate)} · صالح حتى: {dateFormatter.format(expiryDate)}
          </p>
        </div>

        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-right border-b border-slate-300">
              <th className="py-2 font-medium">البند</th>
              <th className="py-2 font-medium">المبلغ</th>
            </tr>
          </thead>
          <tbody>
            {proposal.items.map((item, i) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="py-2">{item.description}</td>
                <td className="py-2">{currency.format(item.amount)} €</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="py-3 font-bold">الإجمالي</td>
              <td className="py-3 font-bold">{currency.format(total)} €</td>
            </tr>
          </tfoot>
        </table>

        {proposal.terms && (
          <div>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">الشروط التجارية</h3>
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{proposal.terms}</p>
          </div>
        )}

        <div className="print:hidden space-y-4 border-t border-slate-200 pt-6">
          {deal.stripe_checkout_url && (
            <a
              href={deal.stripe_checkout_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
            >
              الدفع الآن
            </a>
          )}
          <AcceptProposalForm dealId={dealId} proposal={proposal} />
        </div>

        <p className="text-[10px] text-slate-400 pt-4 border-t border-slate-200">
          هذا العرض تقديري وأُعِدّ بمساعدة الذكاء الاصطناعي — الأرقام النهائية تخضع للتأكيد المتبادل. الموافقة
          أعلاه إقرار رقمي بسيط وليست توقيعاً إلكترونياً موثَّقاً قانونياً.
        </p>
      </div>
    </main>
  );
}
