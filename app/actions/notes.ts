"use server";

import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";
import { revalidatePath } from "next/cache";

export type NoteType = "note" | "call" | "inbound_reply";

export type Note = {
  id: string;
  org_id: string;
  lead_id: string | null;
  deal_id: string | null;
  type: NoteType;
  content: string;
  created_at: string;
};

const NOTE_TYPES: NoteType[] = ["note", "call"];

export async function getNotes(leadId: string): Promise<Note[]> {
  const { orgId } = await auth();
  if (!orgId) return [];

  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("org_id", orgId)
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching notes:", error);
    return [];
  }
  return data;
}

export async function addNote(leadId: string, content: string, type: NoteType = "note") {
  const { orgId } = await auth();
  if (!orgId) throw new Error("يجب اختيار منظمة أولاً");

  const trimmed = content.trim();
  if (!trimmed) throw new Error("لا يمكن إضافة ملاحظة فارغة");
  if (!NOTE_TYPES.includes(type)) throw new Error("نوع الملاحظة غير صالح");

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("id")
    .eq("id", leadId)
    .eq("org_id", orgId)
    .single();

  if (leadError || !lead) throw new Error("العميل غير موجود");

  const { error } = await supabase.from("notes").insert([
    {
      org_id: orgId,
      lead_id: leadId,
      type,
      content: trimmed,
    },
  ]);

  if (error) throw new Error(error.message);

  await logActivity({
    orgId,
    leadId,
    type: "note_added",
    description:
      type === "call"
        ? `📞 تسجيل مكالمة: ${trimmed.slice(0, 80)}`
        : `📝 ملاحظة جديدة: ${trimmed.slice(0, 80)}`,
  });

  revalidatePath("/");
}
