"use client";

import { useEffect, useState } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export type LeadRow = {
  id: string;
  org_id: string;
  name: string;
  email: string;
  company: string | null;
  status: string | null;
  ai_score: number | null;
  ai_intent: string | null;
  created_at: string;
};

/**
 * Seeds from `initialLeads` on mount, then applies live INSERT/UPDATE/DELETE
 * events from Supabase Realtime for the given org — the subscription itself
 * is the single source of truth after mount, no prop-resync effect needed.
 * Remount this hook's owner (e.g. via `key={orgId}`) when the org changes.
 */
export function useRealtimeLeads(orgId: string | null | undefined, initialLeads: LeadRow[]) {
  const [leads, setLeads] = useState<LeadRow[]>(initialLeads);

  useEffect(() => {
    if (!orgId) return;

    const channel = supabase
      .channel(`realtime-leads-${orgId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leads", filter: `org_id=eq.${orgId}` },
        (payload: RealtimePostgresChangesPayload<LeadRow>) => {
          setLeads((prev) => {
            if (payload.eventType === "INSERT") {
              const newRow = payload.new as LeadRow;
              if (prev.some((l) => l.id === newRow.id)) return prev;
              return [newRow, ...prev];
            }
            if (payload.eventType === "UPDATE") {
              const newRow = payload.new as LeadRow;
              return prev.map((l) => (l.id === newRow.id ? { ...l, ...newRow } : l));
            }
            if (payload.eventType === "DELETE") {
              const oldRow = payload.old as Partial<LeadRow>;
              return prev.filter((l) => l.id !== oldRow.id);
            }
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId]);

  return leads;
}
