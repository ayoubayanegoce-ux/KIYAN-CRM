"use client";

import { useEffect, useState } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { DealRow } from "@/app/actions/deals";

/**
 * Same pattern as useRealtimeLeads for the deals table. Note: Postgres
 * Realtime payloads only carry the raw `deals` row — the joined `leads`
 * (name/company) info is not included. On UPDATE we merge onto the
 * existing item so its already-loaded `leads` field is preserved; a
 * brand new deal that arrives via INSERT simply won't show a lead
 * subtitle until the next full server fetch.
 */
export function useRealtimeDeals(orgId: string | null | undefined, initialDeals: DealRow[]) {
  const [deals, setDeals] = useState<DealRow[]>(initialDeals);

  useEffect(() => {
    if (!orgId) return;

    const channel = supabase
      .channel(`realtime-deals-${orgId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "deals", filter: `org_id=eq.${orgId}` },
        (payload: RealtimePostgresChangesPayload<DealRow>) => {
          setDeals((prev) => {
            if (payload.eventType === "INSERT") {
              const newRow = payload.new as DealRow;
              if (prev.some((d) => d.id === newRow.id)) return prev;
              return [newRow, ...prev];
            }
            if (payload.eventType === "UPDATE") {
              const newRow = payload.new as DealRow;
              return prev.map((d) => (d.id === newRow.id ? { ...d, ...newRow } : d));
            }
            if (payload.eventType === "DELETE") {
              const oldRow = payload.old as Partial<DealRow>;
              return prev.filter((d) => d.id !== oldRow.id);
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

  return deals;
}
