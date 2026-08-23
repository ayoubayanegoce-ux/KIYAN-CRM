"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Search,
  Loader2,
  AlertTriangle,
  Building2,
  MapPin,
  Mail,
  UserCircle,
  PlusCircle,
  Check,
  ArrowRight,
} from "lucide-react";
import { findProspects, importProspectAsLead, type ProspectCandidate } from "@/app/actions/leadFinder";

export default function LeadFinderClient() {
  const [industry, setIndustry] = useState("");
  const [location, setLocation] = useState("");
  const [results, setResults] = useState<ProspectCandidate[]>([]);
  const [isSearching, startSearchTransition] = useTransition();
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importedKeys, setImportedKeys] = useState<Set<string>>(new Set());

  function handleSearch() {
    if (!industry.trim()) {
      setError("الرجاء إدخال قطاع النشاط");
      return;
    }
    setError(null);
    startSearchTransition(async () => {
      try {
        const candidates = await findProspects(industry, location);
        setResults(candidates);
        setSearched(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "فشل البحث");
      }
    });
  }

  return (
    <div className="space-y-6">
      <Link href="/" className="text-sm text-blue-400 hover:text-blue-300 transition inline-flex items-center gap-1.5">
        <ArrowRight size={14} /> العودة إلى لوحة التحكم
      </Link>

      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Search size={20} className="text-blue-400" /> محرك البحث والتنقيب عن الشركات
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          صف قطاع النشاط والمنطقة المستهدَفة، وسيقترح الذكاء الاصطناعي شركات تجريبية مطابقة لهذا الوصف.
        </p>
      </div>

      <div className="p-3 bg-amber-950/30 border border-amber-800/50 rounded-lg flex items-start gap-2">
        <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-300 leading-relaxed">
          هذه نتائج <strong>توضيحية مولَّدة بالذكاء الاصطناعي (محاكاة)</strong> وليست بحثاً حقيقياً في بيانات شركات
          فعلية — الأسماء والبريد الإلكتروني تقديرية بالكامل. تحقّق من صحة أي بيانات هنا قبل التواصل الفعلي مع أي
          شركة.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs text-slate-400">قطاع النشاط</label>
          <input
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            placeholder="Marketing Agencies"
            className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm focus:outline-blue-500"
          />
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="text-xs text-slate-400">المدينة / الدولة (اختياري)</label>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Paris"
            className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm focus:outline-blue-500"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={isSearching}
          className="py-2 px-5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition cursor-pointer disabled:opacity-50 flex items-center gap-2"
        >
          {isSearching ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />} بحث
        </button>
      </div>

      {error && <p className="text-red-400 text-sm text-center">{error}</p>}

      {isSearching ? (
        <div className="flex items-center justify-center py-16 text-slate-400 text-sm gap-2">
          <Loader2 size={18} className="animate-spin" /> جاري البحث عن شركات مطابقة...
        </div>
      ) : searched && results.length === 0 ? (
        <p className="text-slate-500 text-sm text-center py-10">لم يتم العثور على نتائج، جرّب وصفاً مختلفاً.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {results.map((candidate, i) => {
            const key = `${candidate.companyName}-${i}`;
            const imported = importedKeys.has(key);
            return (
              <ProspectCard
                key={key}
                candidate={candidate}
                imported={imported}
                onImported={() => setImportedKeys((prev) => new Set(prev).add(key))}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProspectCard({
  candidate,
  imported,
  onImported,
}: {
  candidate: ProspectCandidate;
  imported: boolean;
  onImported: () => void;
}) {
  const [isImporting, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleImport() {
    setError(null);
    startTransition(async () => {
      try {
        await importProspectAsLead(candidate);
        onImported();
      } catch (e) {
        setError(e instanceof Error ? e.message : "فشل الاستيراد");
      }
    });
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
      <h3 className="font-semibold text-slate-100 flex items-center gap-2">
        <Building2 size={15} className="text-blue-400" /> {candidate.companyName}
      </h3>
      <div className="space-y-1 text-xs text-slate-400">
        {candidate.location && (
          <p className="flex items-center gap-1.5">
            <MapPin size={11} /> {candidate.location}
          </p>
        )}
        {candidate.estimatedEmail && (
          <p className="flex items-center gap-1.5 font-mono">
            <Mail size={11} /> {candidate.estimatedEmail}
          </p>
        )}
        {(candidate.suggestedContactName || candidate.suggestedTitle) && (
          <p className="flex items-center gap-1.5">
            <UserCircle size={11} /> {candidate.suggestedContactName}
            {candidate.suggestedContactName && candidate.suggestedTitle ? " — " : ""}
            {candidate.suggestedTitle}
          </p>
        )}
      </div>
      {candidate.notes && <p className="text-xs text-slate-500 italic">{candidate.notes}</p>}

      <button
        onClick={handleImport}
        disabled={isImporting || imported}
        className={`w-full py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition cursor-pointer disabled:cursor-not-allowed ${
          imported
            ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
            : "bg-slate-800 hover:bg-blue-700 text-slate-300 hover:text-white disabled:opacity-50"
        }`}
      >
        {isImporting ? (
          <Loader2 size={13} className="animate-spin" />
        ) : imported ? (
          <Check size={13} />
        ) : (
          <PlusCircle size={13} />
        )}
        {imported ? "تم الاستيراد" : "استيراد إلى الـ Leads بنقرة واحدة"}
      </button>
      {error && <p className="text-red-400 text-[11px] text-center">{error}</p>}
    </div>
  );
}
