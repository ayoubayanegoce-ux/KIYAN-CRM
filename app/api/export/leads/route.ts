import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { rowsToCsv } from "@/lib/csv";
import { NextResponse } from "next/server";

export async function GET() {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ error: "يجب اختيار منظمة أولاً" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const headers = [
    "id",
    "name",
    "email",
    "company",
    "ai_score",
    "priority",
    "industry",
    "company_model",
    "pain_points",
    "sequence_status",
    "assignee_name",
    "status",
    "created_at",
  ];
  const csv = rowsToCsv(
    headers,
    (data ?? []).map((lead) => ({
      id: lead.id,
      name: lead.name,
      email: lead.email,
      company: lead.company ?? "",
      ai_score: lead.ai_score ?? "",
      priority: lead.ai_intent ? lead.ai_intent.toUpperCase() : "",
      industry: lead.enriched_data?.industry ?? "",
      company_model: lead.enriched_data?.companyModel ?? "",
      pain_points: lead.enriched_data?.painPoints ?? "",
      sequence_status: lead.sequence_status ?? "",
      assignee_name: lead.assignee_name ?? "",
      status: lead.status ?? "",
      created_at: lead.created_at ?? "",
    }))
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leads-${orgId}.csv"`,
    },
  });
}
