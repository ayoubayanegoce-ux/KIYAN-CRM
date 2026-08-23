import { auth } from "@clerk/nextjs/server";
import LeadFinderClient from "./LeadFinderClient";

export default async function LeadFinderPage() {
  const { orgId } = await auth();

  if (!orgId) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <p className="text-amber-400">يجب اختيار منظمة أولاً لاستخدام محرك البحث عن العملاء.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <LeadFinderClient />
      </div>
    </main>
  );
}
