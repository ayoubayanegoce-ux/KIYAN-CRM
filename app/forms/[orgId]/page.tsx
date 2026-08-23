import PublicLeadForm from "./PublicLeadForm";

export default async function PublicFormPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <PublicLeadForm orgId={orgId} />
    </main>
  );
}
