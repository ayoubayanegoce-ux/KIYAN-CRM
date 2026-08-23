"use server";

import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { logActivity, type ActivityType } from "@/lib/activity";
import { SEQUENCE_TASK_PREFIX } from "@/lib/ai";
import { revalidatePath } from "next/cache";

export type Activity = {
  id: string;
  org_id: string;
  lead_id: string | null;
  deal_id: string | null;
  type: ActivityType;
  description: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type TaskStatus = "pending" | "done" | "cancelled";

export type Task = {
  id: string;
  org_id: string;
  lead_id: string | null;
  deal_id: string | null;
  title: string;
  description: string | null;
  due_date: string;
  status: TaskStatus;
  created_at: string;
};

export async function getActivities(leadId: string): Promise<Activity[]> {
  const { orgId } = await auth();
  if (!orgId) return [];

  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .eq("org_id", orgId)
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching activities:", error);
    return [];
  }
  return data;
}

export async function getTasks(leadId: string): Promise<Task[]> {
  const { orgId } = await auth();
  if (!orgId) return [];

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("org_id", orgId)
    .eq("lead_id", leadId)
    .order("due_date", { ascending: true });

  if (error) {
    console.error("Error fetching tasks:", error);
    return [];
  }
  return data;
}

export async function addFollowUpTask(
  leadId: string,
  title: string,
  dueDate: string,
  description?: string
) {
  const { orgId } = await auth();
  if (!orgId) throw new Error("يجب اختيار منظمة أولاً");

  const trimmedTitle = title.trim();
  if (!trimmedTitle) throw new Error("عنوان المهمة مطلوب");
  if (!dueDate) throw new Error("تاريخ الاستحقاق مطلوب");

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("id")
    .eq("id", leadId)
    .eq("org_id", orgId)
    .single();

  if (leadError || !lead) throw new Error("العميل غير موجود");

  const { error } = await supabase.from("tasks").insert([
    {
      org_id: orgId,
      lead_id: leadId,
      title: trimmedTitle,
      description: description?.trim() || null,
      due_date: dueDate,
      status: "pending",
    },
  ]);

  if (error) throw new Error(error.message);

  await logActivity({
    orgId,
    leadId,
    type: "task_scheduled",
    description: `📅 تمت جدولة مهمة متابعة: "${trimmedTitle}" (استحقاق ${dueDate})`,
    metadata: { due_date: dueDate },
  });

  revalidatePath("/");
}

export async function completeTask(taskId: string) {
  const { orgId } = await auth();
  if (!orgId) throw new Error("يجب اختيار منظمة أولاً");

  const { data: task, error: fetchError } = await supabase
    .from("tasks")
    .select("lead_id, title")
    .eq("id", taskId)
    .eq("org_id", orgId)
    .single();

  if (fetchError || !task) throw new Error("المهمة غير موجودة");

  const { error } = await supabase
    .from("tasks")
    .update({ status: "done" })
    .eq("id", taskId)
    .eq("org_id", orgId);

  if (error) throw new Error(error.message);

  // إن كانت هذه إحدى مهام تسلسل المتابعة المُجدوَلة تلقائياً، حدّث تقدّم
  // التسلسل على العميل (يُستخدَم لعرض شارات Step X Sent في قائمة العملاء).
  if (task.lead_id && task.title.startsWith(SEQUENCE_TASK_PREFIX)) {
    const { data: lead } = await supabase
      .from("leads")
      .select("sequence_step")
      .eq("id", task.lead_id)
      .eq("org_id", orgId)
      .maybeSingle();

    if (lead) {
      const nextStep = (lead.sequence_step ?? 0) + 1;
      await supabase
        .from("leads")
        .update({
          sequence_step: nextStep,
          sequence_status: nextStep >= 3 ? "completed" : "active",
        })
        .eq("id", task.lead_id)
        .eq("org_id", orgId);
    }
  }

  revalidatePath("/");
}
