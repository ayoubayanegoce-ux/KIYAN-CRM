"use client";

import { useState, type ReactNode } from "react";
import { Users, Kanban, BarChart3 } from "lucide-react";

export default function DashboardTabs({
  leadsContent,
  pipelineContent,
  analyticsContent,
}: {
  leadsContent: ReactNode;
  pipelineContent: ReactNode;
  analyticsContent: ReactNode;
}) {
  const [tab, setTab] = useState<"leads" | "pipeline" | "analytics">("leads");

  return (
    <div className="space-y-6">
      <div className="flex gap-2 bg-slate-900 border border-slate-800 p-1.5 rounded-xl w-fit">
        <button
          onClick={() => setTab("leads")}
          className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition cursor-pointer ${
            tab === "leads" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Users size={15} /> Leads
        </button>
        <button
          onClick={() => setTab("pipeline")}
          className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition cursor-pointer ${
            tab === "pipeline" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Kanban size={15} /> Pipeline
        </button>
        <button
          onClick={() => setTab("analytics")}
          className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition cursor-pointer ${
            tab === "analytics" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <BarChart3 size={15} /> Analytics
        </button>
      </div>

      <div className={tab === "leads" ? "block" : "hidden"}>{leadsContent}</div>
      <div className={tab === "pipeline" ? "block" : "hidden"}>{pipelineContent}</div>
      <div className={tab === "analytics" ? "block" : "hidden"}>{analyticsContent}</div>
    </div>
  );
}
