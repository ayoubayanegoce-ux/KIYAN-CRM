import Link from "next/link";
import { Zap } from "lucide-react";

export default function CreditUsageBar({ used, quota }: { used: number; quota: number }) {
  if (quota <= 0) {
    return (
      <Link
        href="/billing"
        className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-[11px] text-emerald-400 font-medium transition"
      >
        <Zap size={12} /> رصيد غير محدود
      </Link>
    );
  }

  const pct = Math.min(100, quota > 0 ? (used / quota) * 100 : 0);
  const barColor = pct > 90 ? "bg-red-500" : pct > 70 ? "bg-amber-500" : "bg-emerald-500";
  const textColor = pct > 90 ? "text-red-400" : pct > 70 ? "text-amber-400" : "text-emerald-400";

  return (
    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-lg">
      <div className="flex flex-col gap-1 min-w-[120px]">
        <span className={`text-[10px] font-mono leading-none ${textColor}`}>
          الرصيد الشهري: {used} / {quota}
        </span>
        <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden w-full">
          <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
      <Link
        href="/billing"
        className="text-[10px] px-2 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-md font-medium text-white transition whitespace-nowrap flex items-center gap-1"
      >
        <Zap size={10} /> ترقية الباقة
      </Link>
    </div>
  );
}
