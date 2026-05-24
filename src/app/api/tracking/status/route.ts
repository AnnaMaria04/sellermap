import { NextResponse } from "next/server";
import { getMarketProviderHealth } from "@/services/marketDataProvider";
import { supabaseRest } from "@/services/supabaseRest";

export const dynamic = "force-dynamic";

async function count(table: string, filter?: Record<string, string>) {
  const result = await supabaseRest<Array<{ id: string }>>(table, {
    query: { select: "id", limit: "10000", ...(filter ?? {}) },
  });
  return result.ok ? result.data.length : null;
}

async function latest(table: string) {
  const result = await supabaseRest<Array<{ created_at?: string; last_checked_at?: string }>>(table, {
    query: { select: "created_at,last_checked_at", order: "created_at.desc", limit: "1" },
  });
  return result.ok ? result.data[0] ?? null : null;
}

export async function GET() {
  const [providers, trackedProducts, trackedKeywords, productSnapshots, searchSnapshots, analyses, keywordLatest, productLatest] =
    await Promise.all([
      getMarketProviderHealth(),
      count("tracked_products", { tracking_status: "eq.active" }),
      count("tracked_keywords", { tracking_status: "eq.active" }),
      count("wb_product_snapshots"),
      count("wb_search_snapshots"),
      count("market_analyses"),
      latest("tracked_keywords"),
      latest("tracked_products"),
    ]);

  return NextResponse.json({
    ok: true,
    providers,
    counts: {
      trackedProducts,
      trackedKeywords,
      productSnapshots,
      searchSnapshots,
      analyses,
    },
    lastRuns: {
      keywords: keywordLatest?.last_checked_at ?? keywordLatest?.created_at ?? null,
      products: productLatest?.last_checked_at ?? productLatest?.created_at ?? null,
    },
    cronProtected: Boolean(process.env.CRON_SECRET),
  });
}
