import { supabase } from "@/lib/supabase";

export type ActivityType =
  | "lead_created"
  | "ai_qualified"
  | "email_sent"
  | "deal_created"
  | "deal_stage_changed"
  | "note_added"
  | "task_scheduled"
  | "lead_converted"
  | "meeting_scheduled"
  | "sequence_paused"
  | "company_enriched"
  | "lead_assigned";

/**
 * Internal-only logger — not a server action. Callers (other server actions,
 * the webhook route) already resolve and trust `orgId` themselves; this is
 * never wired to a client button directly, same pattern as lib/ai.ts.
 * Swallows its own errors so a missing/misconfigured `activities` table
 * never breaks the primary operation that triggered the log.
 */
export async function logActivity(params: {
  orgId: string;
  leadId?: string | null;
  dealId?: string | null;
  type: ActivityType;
  description: string;
  metadata?: Record<string, unknown>;
}) {
  const { error } = await supabase.from("activities").insert([
    {
      org_id: params.orgId,
      lead_id: params.leadId ?? null,
      deal_id: params.dealId ?? null,
      type: params.type,
      description: params.description,
      metadata: params.metadata ?? null,
    },
  ]);

  if (error) {
    console.error("Failed to log activity:", error);
  }
}
