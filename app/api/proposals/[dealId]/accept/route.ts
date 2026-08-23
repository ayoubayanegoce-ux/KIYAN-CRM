import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";
import type { DealProposal } from "@/app/actions/deals";

/**
 * موافقة رقمية بسيطة (اسم + نقرة، مع طابع زمني) وليست توقيعاً إلكترونياً
 * قانونياً موثَّقاً (لا تكامل مع DocuSign أو ما شابه في هذا المشروع). نقطة
 * عامة غير محمية بالتصميم — رابط العرض نفسه هو "المفتاح"، تماماً كنموذج
 * استقبال العملاء العام.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ dealId: string }> }) {
  const { dealId } = await params;

  let body: { name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const name = (body.name || "").trim().slice(0, 200);
  if (!name) {
    return NextResponse.json({ error: "الاسم مطلوب للموافقة" }, { status: 400 });
  }

  const { data: deal, error } = await supabase
    .from("deals")
    .select("id, org_id, title, proposal")
    .eq("id", dealId)
    .single();

  if (error || !deal || !deal.proposal) {
    return NextResponse.json({ error: "العرض غير موجود" }, { status: 404 });
  }

  const proposal = deal.proposal as DealProposal;
  if (proposal.status === "accepted") {
    return NextResponse.json({ success: true, alreadyAccepted: true });
  }

  const updatedProposal: DealProposal = {
    ...proposal,
    status: "accepted",
    acceptedByName: name,
    acceptedAt: new Date().toISOString(),
  };

  const { error: updateError } = await supabase.from("deals").update({ proposal: updatedProposal }).eq("id", dealId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await logActivity({
    orgId: deal.org_id,
    dealId,
    type: "proposal_accepted",
    description: `✅ وافق العميل "${name}" على عرض السعر لصفقة "${deal.title}"`,
  });

  revalidatePath("/");
  return NextResponse.json({ success: true });
}
