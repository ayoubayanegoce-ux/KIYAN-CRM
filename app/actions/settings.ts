"use server";

import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export async function getAutopilotSetting(): Promise<boolean> {
  const { orgId } = await auth();
  if (!orgId) return false;

  const { data, error } = await supabase
    .from("org_settings")
    .select("autopilot_enabled")
    .eq("org_id", orgId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching org settings:", error);
    return false;
  }
  return data?.autopilot_enabled ?? false;
}

export async function setAutopilotSetting(enabled: boolean) {
  const { orgId } = await auth();
  if (!orgId) throw new Error("يجب اختيار منظمة أولاً");

  const { error } = await supabase
    .from("org_settings")
    .upsert(
      { org_id: orgId, autopilot_enabled: enabled, updated_at: new Date().toISOString() },
      { onConflict: "org_id" }
    );

  if (error) throw new Error(error.message);
  revalidatePath("/");
}
