"use client";

import { useOptimistic, useState, useTransition } from "react";
import { GripVertical, CreditCard, ExternalLink, CheckCircle2, AlertCircle, Loader2, FileText, Copy, Check } from "lucide-react";
import { updateDealStage, createDealCheckoutSession, generateProposal, type DealStage, type DealRow } from "@/app/actions/deals";
import { useRealtimeDeals } from "@/lib/hooks/useRealtimeDeals";

const STAGES: { key: DealStage; label: string; accent: string }[] = [
  { key: "discovery", label: "Discovery", accent: "border-sky-800/60 bg-sky-950/20" },
  { key: "meeting_scheduled", label: "Meeting Scheduled", accent: "border-teal-800/60 bg-teal-950/20" },
  { key: "proposal", label: "Proposal", accent: "border-indigo-800/60 bg-indigo-950/20" },
  { key: "negotiation", label: "Negotiation", accent: "border-amber-800/60 bg-amber-950/20" },
  { key: "won", label: "Won", accent: "border-emerald-800/60 bg-emerald-950/20" },
  { key: "lost", label: "Lost", accent: "border-red-800/60 bg-red-950/20" },
];

const currency = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

export default function DealsKanban({ deals, orgId, appUrl }: { deals: DealRow[]; orgId: string; appUrl: string }) {
  const liveDeals = useRealtimeDeals(orgId, deals);
  const [optimisticDeals, setOptimisticStage] = useOptimistic(
    liveDeals,
    (state, { id, stage }: { id: string; stage: DealStage }) =>
      state.map((d) => (d.id === id ? { ...d, stage } : d))
  );
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<DealStage | null>(null);
  const [, startTransition] = useTransition();

  function handleDrop(stage: DealStage) {
    setOverStage(null);
    if (!dragId) return;
    const id = dragId;
    setDragId(null);

    const current = optimisticDeals.find((d) => d.id === id);
    if (!current || current.stage === stage) return;

    startTransition(async () => {
      setOptimisticStage({ id, stage });
      try {
        await updateDealStage(id, stage);
      } catch (error) {
        console.error(error);
      }
    });
  }

  if (optimisticDeals.length === 0) {
    return (
      <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-xl text-slate-500 text-sm">
        لا توجد صفقات بعد. حوّل عميلاً مؤهلاً إلى صفقة من تبويب &quot;Leads&quot;.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {STAGES.map((s) => {
        const stageDeals = optimisticDeals.filter((d) => d.stage === s.key);
        const total = stageDeals.reduce((sum, d) => sum + (Number(d.deal_value) || 0), 0);
        const isOver = overStage === s.key;

        return (
          <div
            key={s.key}
            onDragOver={(e) => {
              e.preventDefault();
              setOverStage(s.key);
            }}
            onDragLeave={() => setOverStage((prev) => (prev === s.key ? null : prev))}
            onDrop={(e) => {
              e.preventDefault();
              handleDrop(s.key);
            }}
            className={`rounded-xl border p-3 min-h-[320px] flex flex-col gap-2 transition ${s.accent} ${
              isOver ? "ring-2 ring-blue-500" : ""
            }`}
          >
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold text-slate-200">{s.label}</h3>
              <span className="text-[10px] text-slate-400 font-mono bg-slate-950/60 px-1.5 py-0.5 rounded">
                {stageDeals.length}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              الإجمالي: <strong className="text-slate-200">{currency.format(total)} €</strong>
            </p>

            <div className="flex flex-col gap-2 flex-1 mt-1">
              {stageDeals.map((deal) => (
                <div
                  key={deal.id}
                  draggable
                  onDragStart={() => setDragId(deal.id)}
                  onDragEnd={() => {
                    setDragId(null);
                    setOverStage(null);
                  }}
                  className="bg-slate-950 border border-slate-800 rounded-lg p-3 cursor-grab active:cursor-grabbing shadow-sm hover:border-slate-700 transition"
                >
                  <div className="flex items-start gap-1.5">
                    <GripVertical size={13} className="text-slate-600 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-100 truncate">{deal.title}</p>
                      {deal.leads?.name && (
                        <p className="text-[11px] text-slate-500 truncate">
                          {deal.leads.name}
                          {deal.leads.company ? ` • ${deal.leads.company}` : ""}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-emerald-400 font-mono">
                          {currency.format(Number(deal.deal_value) || 0)} €
                        </p>
                        <span className="text-[10px] text-amber-400 font-mono bg-amber-950/40 px-1.5 py-0.5 rounded">
                          🎯 {deal.win_probability ?? 50}%
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <PaymentAction
                          dealId={deal.id}
                          paymentStatus={deal.payment_status}
                          checkoutUrl={deal.youcanpay_order_id ? `/pay/${deal.youcanpay_order_id}` : null}
                        />
                        <ProposalAction dealId={deal.id} hasProposal={!!deal.proposal} appUrl={appUrl} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {stageDeals.length === 0 && (
                <p className="text-[11px] text-slate-600 text-center py-6 border border-dashed border-slate-800 rounded-lg">
                  اسحب صفقة هنا
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PaymentAction({
  dealId,
  paymentStatus,
  checkoutUrl,
}: {
  dealId: string;
  paymentStatus: DealRow["payment_status"];
  checkoutUrl: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleCreateLink() {
    setError(null);
    startTransition(async () => {
      try {
        const { url } = await createDealCheckoutSession(dealId);
        window.open(url, "_blank", "noopener,noreferrer");
      } catch (e) {
        setError(e instanceof Error ? e.message : "فشل إنشاء رابط الدفع");
      }
    });
  }

  if (paymentStatus === "paid") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-medium">
        <CheckCircle2 size={11} /> Payée
      </span>
    );
  }

  return (
    <div onClick={(e) => e.stopPropagation()} title={error ?? undefined}>
      {paymentStatus === "pending" && checkoutUrl ? (
        <a
          href={checkoutUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg bg-slate-800 hover:bg-violet-700 text-slate-300 hover:text-white transition cursor-pointer font-medium"
        >
          <ExternalLink size={11} /> Lien de paiement
        </a>
      ) : (
        <button
          onClick={handleCreateLink}
          disabled={isPending}
          className={`inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg font-medium transition cursor-pointer disabled:opacity-50 ${
            paymentStatus === "failed"
              ? "bg-red-950 hover:bg-red-900 text-red-400 border border-red-800"
              : "bg-slate-800 hover:bg-violet-700 text-slate-300 hover:text-white"
          }`}
        >
          {isPending ? (
            <Loader2 size={11} className="animate-spin" />
          ) : paymentStatus === "failed" ? (
            <AlertCircle size={11} />
          ) : (
            <CreditCard size={11} />
          )}
          {paymentStatus === "failed" ? "إعادة محاولة الدفع" : "Créer un lien de paiement"}
        </button>
      )}
      {error && <p className="text-[10px] text-red-400 mt-1">{error}</p>}
    </div>
  );
}

function ProposalAction({ dealId, hasProposal, appUrl }: { dealId: string; hasProposal: boolean; appUrl: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [ready, setReady] = useState(hasProposal);

  const proposalUrl = `${appUrl}/proposals/${dealId}`;

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      try {
        await generateProposal(dealId);
        setReady(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "فشل توليد العرض");
      }
    });
  }

  function handleCopy() {
    navigator.clipboard.writeText(proposalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div onClick={(e) => e.stopPropagation()} title={error ?? undefined}>
      {ready ? (
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg bg-slate-800 hover:bg-sky-700 text-slate-300 hover:text-white transition cursor-pointer font-medium"
        >
          {copied ? <Check size={11} /> : <Copy size={11} />} {copied ? "تم النسخ" : "نسخ رابط العرض"}
        </button>
      ) : (
        <button
          onClick={handleGenerate}
          disabled={isPending}
          className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg bg-slate-800 hover:bg-sky-700 text-slate-300 hover:text-white transition cursor-pointer font-medium disabled:opacity-50"
        >
          {isPending ? <Loader2 size={11} className="animate-spin" /> : <FileText size={11} />} توليد عرض سعر
        </button>
      )}
      {error && <p className="text-[10px] text-red-400 mt-1">{error}</p>}
    </div>
  );
}
