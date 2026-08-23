"use client";

import { useMemo, useState, useTransition } from "react";
import { ArrowRightLeft, Download, Reply, Loader2, Building2, Users2, AlertTriangle, UserCog, Search } from "lucide-react";
import Link from "next/link";
import { useRealtimeLeads, type LeadRow } from "@/lib/hooks/useRealtimeLeads";
import { convertLeadToDeal } from "@/app/actions/deals";
import { assignLead } from "@/app/actions/leads";
import { markLeadReplied } from "@/app/actions/outreach";
import OutreachModal from "./OutreachModal";
import NotesModal from "./NotesModal";
import ActivityModal from "./ActivityModal";
import SequenceModal from "./SequenceModal";
import BattlecardModal from "./BattlecardModal";
import ImportLeadsButton from "./ImportLeadsButton";

const QUALIFIED_INTENTS = ["hot", "warm"];

type AssigneeFilter = "all" | "mine" | "unassigned";

export default function LeadsList({
  orgId,
  initialLeads,
  members,
  currentUserId,
}: {
  orgId: string;
  initialLeads: LeadRow[];
  members: { userId: string; name: string }[];
  currentUserId: string | null;
}) {
  const leads = useRealtimeLeads(orgId, initialLeads);
  const [assigneeFilter, setAssigneeFilter] = useState<AssigneeFilter>("all");

  const filteredLeads = useMemo(() => {
    if (assigneeFilter === "mine") return leads.filter((l) => l.assignee_id === currentUserId);
    if (assigneeFilter === "unassigned") return leads.filter((l) => !l.assignee_id);
    return leads;
  }, [leads, assigneeFilter, currentUserId]);

  return (
    <div className="md:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <span>📋</span> قائمة العملاء ({filteredLeads.length})
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-slate-800 rounded-lg p-0.5 text-xs">
            {(
              [
                ["all", "الجميع"],
                ["mine", "عملائي فقط"],
                ["unassigned", "غير معيّن"],
              ] as [AssigneeFilter, string][]
            ).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setAssigneeFilter(value)}
                className={`px-2.5 py-1.5 rounded-md font-medium transition cursor-pointer ${
                  assigneeFilter === value ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <Link
            href="/leads/finder"
            className="px-3 py-2 bg-slate-800 hover:bg-blue-700 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-2"
          >
            <Search size={14} /> البحث عن عملاء جدد
          </Link>
          <a
            href="/api/export/leads"
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-2"
          >
            <Download size={14} /> تصدير CSV
          </a>
          <ImportLeadsButton />
        </div>
      </div>

      {filteredLeads.length === 0 ? (
        <p className="text-slate-500 text-sm py-8 text-center">
          {leads.length === 0 ? "لا يوجد عملاء مضافون لهذه المنظمة بعد." : "لا يوجد عملاء مطابقون لهذا الفلتر."}
        </p>
      ) : (
        <div className="space-y-3">
          {filteredLeads.map((lead) => {
            const isQualified = QUALIFIED_INTENTS.includes(lead.ai_intent ?? "");
            const isConverted = lead.status === "converted";
            const isContacted = lead.status === "contacted";

            return (
              <div
                key={lead.id}
                className="p-4 bg-slate-950 border border-slate-800/80 rounded-lg flex flex-wrap justify-between items-center gap-3"
              >
                <div className="min-w-0">
                  <h3 className="font-medium text-slate-200 truncate">{lead.name}</h3>
                  <p className="text-xs text-slate-400 truncate">
                    {lead.email} {lead.company && `• ${lead.company}`}
                  </p>
                  {lead.enriched_data && (
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      {lead.enriched_data.industry && (
                        <span
                          title="القطاع (تقدير بالذكاء الاصطناعي)"
                          className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 font-medium flex items-center gap-1"
                        >
                          <Building2 size={10} /> {lead.enriched_data.industry}
                        </span>
                      )}
                      {lead.enriched_data.companyModel && (
                        <span
                          title="النموذج/الحجم (تقدير بالذكاء الاصطناعي)"
                          className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-medium flex items-center gap-1"
                        >
                          <Users2 size={10} /> {lead.enriched_data.companyModel}
                        </span>
                      )}
                      {lead.enriched_data.painPoints && (
                        <span
                          title={lead.enriched_data.painPoints}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950 text-amber-400 border border-amber-800 font-medium flex items-center gap-1 max-w-[220px] truncate"
                        >
                          <AlertTriangle size={10} className="shrink-0" />
                          <span className="truncate">{lead.enriched_data.painPoints}</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xs text-slate-400 font-mono">
                    التقييم: <strong className="text-white">{lead.ai_score ?? 0}/100</strong>
                  </span>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      lead.ai_intent === "hot"
                        ? "bg-red-950 text-red-400 border border-red-800"
                        : lead.ai_intent === "warm"
                        ? "bg-amber-950 text-amber-400 border border-amber-800"
                        : "bg-slate-800 text-slate-400 border border-slate-700"
                    }`}
                  >
                    {lead.ai_intent ? lead.ai_intent.toUpperCase() : "COLD"}
                  </span>

                  <AssigneeDropdown
                    leadId={lead.id}
                    currentAssigneeId={lead.assignee_id}
                    members={members}
                  />

                  <SequenceEngagement leadId={lead.id} status={lead.sequence_status} step={lead.sequence_step} />

                  <OutreachModal leadId={lead.id} leadName={lead.name} />
                  <SequenceModal leadId={lead.id} leadName={lead.name} />
                  <BattlecardModal leadId={lead.id} leadName={lead.name} />
                  <NotesModal leadId={lead.id} leadName={lead.name} />
                  <ActivityModal leadId={lead.id} leadName={lead.name} enrichedData={lead.enriched_data} />

                  {isContacted && (
                    <span className="text-xs px-2.5 py-1.5 rounded-lg bg-sky-950 text-sky-400 border border-sky-800 font-medium">
                      Contactée ✉
                    </span>
                  )}

                  {isConverted ? (
                    <span className="text-xs px-2.5 py-1.5 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800 font-medium">
                      Convertie ✓
                    </span>
                  ) : isQualified ? (
                    <form action={convertLeadToDeal.bind(null, lead.id)}>
                      <button
                        type="submit"
                        title="Convertir en opportunité"
                        className="p-2 rounded-lg bg-slate-800 hover:bg-emerald-700 text-slate-300 hover:text-white transition cursor-pointer flex items-center gap-1.5 text-xs font-medium px-3"
                      >
                        <ArrowRightLeft size={14} /> Convertir
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AssigneeDropdown({
  leadId,
  currentAssigneeId,
  members,
}: {
  leadId: string;
  currentAssigneeId: string | null;
  members: { userId: string; name: string }[];
}) {
  const [isPending, startTransition] = useTransition();

  function handleChange(value: string) {
    const member = members.find((m) => m.userId === value);
    startTransition(async () => {
      try {
        await assignLead(leadId, member?.userId ?? null, member?.name ?? null);
      } catch (error) {
        console.error(error);
      }
    });
  }

  return (
    <div className="relative flex items-center gap-1">
      <UserCog size={13} className="text-slate-500 shrink-0" />
      <select
        value={currentAssigneeId ?? ""}
        onChange={(e) => handleChange(e.target.value)}
        disabled={isPending}
        title="تعيين المسؤول"
        className="text-xs bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-300 focus:outline-blue-500 disabled:opacity-50 cursor-pointer max-w-[130px]"
      >
        <option value="">غير معيّن</option>
        {members.map((member) => (
          <option key={member.userId} value={member.userId}>
            {member.name}
          </option>
        ))}
      </select>
      {isPending && <Loader2 size={12} className="animate-spin text-slate-500" />}
    </div>
  );
}

function SequenceEngagement({
  leadId,
  status,
  step,
}: {
  leadId: string;
  status: string | null;
  step: number | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!status || status === "none") return null;

  function handleMarkReplied() {
    setError(null);
    startTransition(async () => {
      try {
        await markLeadReplied(leadId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "فشل تسجيل الرد");
      }
    });
  }

  const currentStep = step ?? 0;

  return (
    <div className="flex items-center gap-1.5" title={error ?? undefined}>
      {status === "active" && (
        <>
          <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-medium">
            Step {currentStep} Sent
          </span>
          {currentStep < 3 && (
            <span className="text-[10px] px-2 py-1 rounded-full bg-amber-950 text-amber-400 border border-amber-800 font-medium">
              Step {currentStep + 1} Pending
            </span>
          )}
          <button
            onClick={handleMarkReplied}
            disabled={isPending}
            title="تسجيل رد العميل وإيقاف تسلسل المتابعة"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-blue-700 text-slate-300 hover:text-white transition cursor-pointer disabled:opacity-50"
          >
            {isPending ? <Loader2 size={12} className="animate-spin" /> : <Reply size={12} />}
          </button>
        </>
      )}
      {status === "replied" && (
        <span className="text-[10px] px-2 py-1 rounded-full bg-blue-950 text-blue-400 border border-blue-800 font-medium">
          Replied ✓
        </span>
      )}
      {status === "completed" && (
        <span className="text-[10px] px-2 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-medium">
          التسلسل مكتمل
        </span>
      )}
    </div>
  );
}
