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

  const headers = ["id", "name", "email", "company", "status", "ai_score", "ai_intent", "created_at"];
  const csv = rowsToCsv(
    headers,
    (data ?? []).map((lead) => ({
      id: lead.id,
      name: lead.name,
      email: lead.email,
      company: lead.company ?? "",
      status: lead.status ?? "",
      ai_score: lead.ai_score ?? "",
      ai_intent: lead.ai_intent ?? "",
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
