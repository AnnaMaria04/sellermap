import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * G21: durable alert history. Dismiss/seen state was localStorage-only; these
 * helpers mirror alert lifecycle events into the `alert_history` table so they
 * survive across devices and can be reported on. Writes are best-effort —
 * localStorage stays the source of truth for the live UI.
 */

export type AlertEvent = "raised" | "seen" | "dismissed";

export interface AlertEventInput {
  alertId: string;
  event?: AlertEvent;
  title?: string;
  severity?: string;
  category?: string;
  productId?: string;
}

export interface AlertHistoryRow {
  alertId: string;
  event: AlertEvent;
  title: string | null;
  severity: string | null;
  category: string | null;
  createdAt: string;
}

export async function logAlertEvent(
  supabase: SupabaseClient,
  orgId: string | null,
  e: AlertEventInput,
): Promise<void> {
  await supabase
    .from("alert_history")
    .upsert(
      {
        org_id: orgId,
        alert_id: e.alertId,
        event: e.event ?? "dismissed",
        title: e.title ?? null,
        severity: e.severity ?? null,
        category: e.category ?? null,
        product_id: e.productId ?? null,
      },
      { onConflict: "org_id,alert_id,event" },
    );
}

export async function loadAlertHistory(
  supabase: SupabaseClient,
  orgId: string,
  limit = 100,
): Promise<AlertHistoryRow[]> {
  const { data, error } = await supabase
    .from("alert_history")
    .select("alert_id, event, title, severity, category, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    alertId: r.alert_id as string,
    event: r.event as AlertEvent,
    title: (r.title as string | null) ?? null,
    severity: (r.severity as string | null) ?? null,
    category: (r.category as string | null) ?? null,
    createdAt: r.created_at as string,
  }));
}
