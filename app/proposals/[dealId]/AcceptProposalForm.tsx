"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import type { DealProposal } from "@/app/actions/deals";

export default function AcceptProposalForm({ dealId, proposal }: { dealId: string; proposal: DealProposal }) {
  const [name, setName] = useState("");
  const [accepted, setAccepted] = useState(proposal.status === "accepted");
  const [acceptedName, setAcceptedName] = useState(proposal.acceptedByName ?? "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleAccept() {
    if (!name.trim()) {
      setError("الرجاء إدخال الاسم للموافقة");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/proposals/${dealId}/accept`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "فشلت الموافقة");
        setAcceptedName(name);
        setAccepted(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "فشلت الموافقة");
      }
    });
  }

  if (accepted) {
    return (
      <div className="text-center py-4 bg-emerald-50 border border-emerald-200 rounded-lg space-y-1">
        <CheckCircle2 size={24} className="mx-auto text-emerald-600" />
        <p className="text-sm text-emerald-700 font-medium">
          تمت الموافقة على هذا العرض{acceptedName ? ` بواسطة ${acceptedName}` : ""}.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-xs text-slate-500 block">اكتب اسمك الكامل للموافقة إلكترونياً على هذا العرض</label>
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="الاسم الكامل"
          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-blue-500"
        />
        <button
          onClick={handleAccept}
          disabled={isPending}
          className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition cursor-pointer disabled:opacity-50 flex items-center gap-2"
        >
          {isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} أوافق وأمضي
        </button>
      </div>
      {error && <p className="text-red-500 text-xs">{error}</p>}
    </div>
  );
}
