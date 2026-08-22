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
    .from("deals")
    .select("*, leads(name, company)")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const headers = ["id", "title", "stage", "value", "lead_name", "lead_company", "created_at"];
  const csv = rowsToCsv(
    headers,
    (data ?? []).map((deal) => ({
      id: deal.id,
      title: deal.title,
      stage: deal.stage ?? "",
      value: deal.value ?? 0,
      lead_name: deal.leads?.name ?? "",
      lead_company: deal.leads?.company ?? "",
      created_at: deal.created_at ?? "",
    }))
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="deals-${orgId}.csv"`,
    },
  });
}
