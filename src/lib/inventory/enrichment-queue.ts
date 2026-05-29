import type { SupabaseClient } from "@supabase/supabase-js";
import { createEnrichmentPlan, type CheckDraftContext } from "./foundation";

/**
 * F17: client side of the async enrichment pipeline. /check builds a draft and
 * an enrichment plan synchronously; this enqueues the plan's tasks into the
 * `enrichment_jobs` queue and kicks the `enrich-product` Edge Function, which
 * drains the queue in the background. Status is then polled until done.
 */

export interface EnrichmentJob {
  id: string;
  checkId: string;
  source: string;
  status: "queued" | "processing" | "done" | "error";
  result: Record<string, unknown> | null;
  error: string | null;
}

/** Enqueue the enrichment plan for a check and trigger the background worker. */
export async function enqueueEnrichment(
  supabase: SupabaseClient,
  orgId: string | null,
  context: CheckDraftContext,
): Promise<{ enqueued: number }> {
  const tasks = createEnrichmentPlan(context);
  if (tasks.length === 0) return { enqueued: 0 };

  const rows = tasks.map((t) => ({
    org_id: orgId,
    check_id: context.checkId,
    source: t.source,
    priority: t.priority,
    dedupe_key: t.dedupeKey,
    status: "queued",
    payload: {
      productName: context.productName,
      supplierUrl: context.supplierUrl,
      wbQuery: context.wbQuery,
    },
  }));

  // Idempotent on (check_id, dedupe_key) so /check can be retried safely.
  const { error } = await supabase
    .from("enrichment_jobs")
    .upsert(rows, { onConflict: "check_id,dedupe_key" });
  if (error) throw error;

  // Fire-and-forget the worker; it also runs on a schedule if configured.
  void supabase.functions.invoke("enrich-product", { body: { drain: true } });

  return { enqueued: rows.length };
}

/** Read the enrichment jobs for a check (for polling completion in the UI). */
export async function getEnrichmentJobs(
  supabase: SupabaseClient,
  checkId: string,
): Promise<EnrichmentJob[]> {
  const { data, error } = await supabase
    .from("enrichment_jobs")
    .select("id, check_id, source, status, result, error")
    .eq("check_id", checkId);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id as string,
    checkId: r.check_id as string,
    source: r.source as string,
    status: r.status as EnrichmentJob["status"],
    result: (r.result as Record<string, unknown> | null) ?? null,
    error: (r.error as string | null) ?? null,
  }));
}

/** True once every job for the check has reached a terminal state. */
export function isEnrichmentComplete(jobs: EnrichmentJob[]): boolean {
  return jobs.length > 0 && jobs.every((j) => j.status === "done" || j.status === "error");
}
