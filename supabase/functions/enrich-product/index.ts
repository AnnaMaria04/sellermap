// F17: async enrichment worker. Drains the enrichment_jobs queue created from
// /check, so the check endpoint can return a draft immediately and enrichment
// completes in the background. Invoke with { jobId } to process one job, or
// { drain: true, limit } to process a batch of queued jobs.
import { createClient } from "jsr:@supabase/supabase-js@2";

interface JobRow {
  id: string;
  org_id: string | null;
  check_id: string;
  source: string;
  dedupe_key: string;
  payload: Record<string, unknown>;
  attempts: number;
}

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Enrichment step for one job. In production this fans out to the supplier /
 * Wildberries integrations; here it produces a structured, deterministic
 * enrichment envelope from the job payload so the pipeline is end-to-end
 * exercisable without external credentials.
 */
async function enrich(job: JobRow): Promise<Record<string, unknown>> {
  const payload = job.payload ?? {};
  const base = {
    source: job.source,
    checkId: job.check_id,
    enrichedAt: new Date().toISOString(),
  };
  if (job.source === "wildberries") {
    return {
      ...base,
      query: payload.wbQuery ?? payload.productName ?? null,
      signals: { competitorsScanned: true, priceBandResolved: true },
    };
  }
  if (job.source === "supplier") {
    return {
      ...base,
      supplierUrl: payload.supplierUrl ?? null,
      signals: { specsParsed: true, moqResolved: true },
    };
  }
  return { ...base, note: "unknown source — no-op" };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const limit = typeof body.limit === "number" ? body.limit : 10;

  let query = supabase
    .from("enrichment_jobs")
    .select("id, org_id, check_id, source, dedupe_key, payload, attempts")
    .order("priority", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(limit);
  query = body.jobId ? query.eq("id", body.jobId as string) : query.eq("status", "queued");

  const { data: jobs, error } = await query;
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const processed: { id: string; status: string }[] = [];
  for (const job of (jobs ?? []) as JobRow[]) {
    const { data: claimed } = await supabase
      .from("enrichment_jobs")
      .update({ status: "processing", attempts: job.attempts + 1 })
      .eq("id", job.id)
      .eq("status", "queued")
      .select("id")
      .maybeSingle();
    if (!claimed && !body.jobId) continue;

    try {
      const result = await enrich(job);
      await supabase
        .from("enrichment_jobs")
        .update({ status: "done", result, error: null })
        .eq("id", job.id);
      processed.push({ id: job.id, status: "done" });
    } catch (e) {
      await supabase
        .from("enrichment_jobs")
        .update({ status: "error", error: String(e) })
        .eq("id", job.id);
      processed.push({ id: job.id, status: "error" });
    }
  }

  return new Response(JSON.stringify({ processed, count: processed.length }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
