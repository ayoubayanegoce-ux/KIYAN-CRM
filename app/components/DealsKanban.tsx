"use client";

import { useOptimistic, useState, useTransition } from "react";
import { GripVertical } from "lucide-react";
import { updateDealStage, type DealStage, type DealRow } from "@/app/actions/deals";
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

export default function DealsKanban({ deals, orgId }: { deals: DealRow[]; orgId: string }) {
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
