import type { ComponentType } from "react";
import {
  History,
  UserPlus,
  Sparkles,
  Mail,
  Handshake,
  ArrowRightLeft,
  StickyNote,
  CalendarClock,
  CalendarCheck,
  PauseCircle,
  Building2,
} from "lucide-react";
import type { Activity } from "@/app/actions/activities";

const TYPE_META: Record<string, { icon: ComponentType<{ size?: number }>; color: string }> = {
  lead_created: { icon: UserPlus, color: "text-blue-400" },
  ai_qualified: { icon: Sparkles, color: "text-amber-400" },
  email_sent: { icon: Mail, color: "text-emerald-400" },
  deal_created: { icon: Handshake, color: "text-indigo-400" },
  deal_stage_changed: { icon: ArrowRightLeft, color: "text-sky-400" },
  note_added: { icon: StickyNote, color: "text-purple-400" },
  task_scheduled: { icon: CalendarClock, color: "text-pink-400" },
  lead_converted: { icon: Handshake, color: "text-emerald-400" },
  meeting_scheduled: { icon: CalendarCheck, color: "text-teal-400" },
  sequence_paused: { icon: PauseCircle, color: "text-orange-400" },
  company_enriched: { icon: Building2, color: "text-cyan-400" },
};

const dateFormatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" });

export default function ActivityTimeline({ activities }: { activities: Activity[] }) {
  if (activities.length === 0) {
    return <p className="text-slate-500 text-sm text-center py-6">لا يوجد نشاط مسجَّل بعد.</p>;
  }

  return (
    <ol className="space-y-3">
      {activities.map((activity) => {
        const meta = TYPE_META[activity.type] ?? { icon: History, color: "text-slate-400" };
        const Icon = meta.icon;
        return (
          <li key={activity.id} className="flex gap-3">
            <div className={`shrink-0 mt-0.5 ${meta.color}`}>
              <Icon size={15} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-slate-300">{activity.description}</p>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                {dateFormatter.format(new Date(activity.created_at))}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
