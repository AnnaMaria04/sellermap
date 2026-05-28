import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loadMarketAggregates } from "@/lib/analysis/marketAggregates";

// Returns market aggregates (median price, percentiles, seller concentration,
// review medians, sample size) for a given keyword/category. Reads from
// daily_market_metrics first, falls back to aggregating analysis_competitors.
// RLS controls visibility — this route just shapes the query.
export async function GET(req: NextRequest) {
  const keyword = req.nextUrl.searchParams.get("keyword");
  const category = req.nextUrl.searchParams.get("category");
  if (!keyword && !category) {
    return NextResponse.json({ ok: false, message: "keyword or category required" }, { status: 400 });
  }
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, message: "supabase unavailable" }, { status: 500 });
  }
  try {
    const aggregates = await loadMarketAggregates(supabase, { keyword, category });
    return NextResponse.json({ ok: true, aggregates });
  } catch (e) {
    return NextResponse.json({ ok: false, message: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
