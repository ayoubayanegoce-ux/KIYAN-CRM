"use client";

import { useState, useTransition } from "react";
import {
  History,
  X,
  Loader2,
  Plus,
  CalendarClock,
  Check,
  Building2,
  Users2,
  Sparkles,
  AlertTriangle,
  TrendingUp,
  MessageCircle,
  Mail,
  Link2,
  Phone,
} from "lucide-react";
import {
  getActivities,
  getTasks,
  addFollowUpTask,
  completeTask,
  type Activity,
  type Task,
} from "@/app/actions/activities";
import type { CompanyProfile, SequenceChannel } from "@/lib/ai";

const CHANNEL_META: Record<SequenceChannel, { icon: typeof Mail; color: string }> = {
  email: { icon: Mail, color: "text-sky-400" },
  linkedin: { icon: Link2, color: "text-blue-400" },
  whatsapp: { icon: Phone, color: "text-emerald-400" },
};
import ActivityTimeline from "./ActivityTimeline";

export default function ActivityModal({
  leadId,
  leadName,
  enrichedData,
}: {
  leadId: string;
  leadName: string;
  enrichedData?: CompanyProfile | null;
}) {
  const [open, setOpen] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [isLoading, startLoadTransition] = useTransition();
  const [isSaving, startSaveTransition] = useTransition();
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDue, setTaskDue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function load() {
    setError(null);
    startLoadTransition(async () => {
      try {
        const [activityResult, taskResult] = await Promise.all([getActivities(leadId), getTasks(leadId)]);
        setActivities(activityResult);
        setTasks(taskResult);
        setLoaded(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "فشل تحميل السجل");
      }
    });
  }

  function handleOpen() {
    setOpen(true);
    if (!loaded) load();
  }

  function handleAddTask() {
    if (!taskTitle.trim() || !taskDue) return;
    setError(null);
    startSaveTransition(async () => {
      try {
        await addFollowUpTask(leadId, taskTitle, taskDue);
        setTaskTitle("");
        setTaskDue("");
        load();
      } catch (e) {
        setError(e instanceof Error ? e.message : "فشل جدولة المهمة");
      }
    });
  }

  function handleComplete(taskId: string) {
    setError(null);
    startSaveTransition(async () => {
      try {
        await completeTask(taskId);
        load();
      } catch (e) {
        setError(e instanceof Error ? e.message : "فشل تحديث المهمة");
      }
    });
  }

  const pendingTasks = tasks.filter((t) => t.status === "pending");

  return (
    <>
      <button
        onClick={handleOpen}
        title="سجل النشاط والمهام"
        className="p-2 rounded-lg bg-slate-800 hover:bg-indigo-700 text-slate-300 hover:text-white transition cursor-pointer"
      >
        <History size={14} />
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 space-y-4 max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <History size={16} /> النشاط والمهام — {leadName}
              </h3>
              <button
                onClick={() => setOpen(false)}
                className="text-slate-500 hover:text-slate-200 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {enrichedData && (
              <div className="space-y-2.5 p-3 bg-cyan-950/20 border border-cyan-900/50 rounded-lg">
                <p className="text-xs font-medium text-cyan-400 flex items-center gap-1.5">
                  <Sparkles size={13} /> ملف الشركة (تقدير بالذكاء الاصطناعي)
                </p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {enrichedData.industry && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 font-medium flex items-center gap-1">
                      <Building2 size={10} /> {enrichedData.industry}
                    </span>
                  )}
                  {enrichedData.companyModel && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-medium flex items-center gap-1">
                      <Users2 size={10} /> {enrichedData.companyModel}
                    </span>
                  )}
                </div>
                {enrichedData.painPoints && (
                  <p className="text-xs text-slate-300 leading-relaxed flex items-start gap-1.5">
                    <AlertTriangle size={12} className="text-amber-400 shrink-0 mt-0.5" />
                    <span>{enrichedData.painPoints}</span>
                  </p>
                )}
                {enrichedData.growthOpportunities && (
                  <p className="text-xs text-slate-300 leading-relaxed flex items-start gap-1.5">
                    <TrendingUp size={12} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span>{enrichedData.growthOpportunities}</span>
                  </p>
                )}
                {enrichedData.icebreaker && (
                  <div className="p-2 bg-slate-950 border border-cyan-900/40 rounded-lg flex items-start gap-1.5">
                    <MessageCircle size={12} className="text-cyan-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-200 italic">&quot;{enrichedData.icebreaker}&quot;</p>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2 border-b border-slate-800 pb-4">
              <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                <CalendarClock size={13} /> مهمة متابعة سريعة
              </p>
              <div className="flex gap-2">
                <input
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="مثال: اتصال متابعة"
                  className="flex-1 min-w-0 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm focus:outline-blue-500"
                />
                <input
                  type="date"
                  value={taskDue}
                  onChange={(e) => setTaskDue(e.target.value)}
                  className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm focus:outline-blue-500"
                />
              </div>
              <button
                onClick={handleAddTask}
                disabled={isSaving || !taskTitle.trim() || !taskDue}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
              >
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} جدولة مهمة
              </button>

              {pendingTasks.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  {pendingTasks.map((t) => {
                    const channelMeta = CHANNEL_META[t.channel] ?? CHANNEL_META.email;
                    const ChannelIcon = channelMeta.icon;
                    return (
                      <div
                        key={t.id}
                        className="flex items-center justify-between gap-2 p-2 bg-slate-950 border border-slate-800/80 rounded-lg"
                      >
                        <div className="min-w-0 flex items-start gap-1.5">
                          <ChannelIcon size={12} className={`shrink-0 mt-0.5 ${channelMeta.color}`} />
                          <div className="min-w-0">
                            <p className="text-xs text-slate-300 truncate">{t.title}</p>
                            {t.description && (
                              <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5">{t.description}</p>
                            )}
                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">استحقاق: {t.due_date}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleComplete(t.id)}
                          title="وضع علامة كمنجزة"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-emerald-700 text-slate-300 hover:text-white transition cursor-pointer shrink-0"
                        >
                          <Check size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {error && <p className="text-red-400 text-xs text-center">{error}</p>}
            </div>

            <div className="flex-1 overflow-y-auto">
              {isLoading && !loaded ? (
                <div className="flex items-center justify-center py-8 text-slate-400 text-sm gap-2">
                  <Loader2 size={16} className="animate-spin" /> جاري التحميل...
                </div>
              ) : (
                <ActivityTimeline activities={activities} />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
