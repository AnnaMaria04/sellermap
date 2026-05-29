// Real market aggregates for the /result page — replaces the hardcoded
// `marketMap` constant in calculateResult.ts. Two paths:
//
//   1. `loadMarketAggregates(supabase, { keyword?, category? })` reads the most
//      recent daily_market_metrics row for the given keyword (or the most
//      recent across the category guess), so the UI shows real medians /
//      percentiles / seller concentration straight from the scraper.
//   2. `aggregateFromCompetitors(rows)` is a pure fallback used when no daily
//      metric exists yet — it derives the same stats from raw competitor /
//      snapshot rows. Useful for ad-hoc analyses and for unit testing the math
//      without a database.
//
// Everything here is pure or read-only; RLS already controls what the user can
// see in `daily_market_metrics`. No new tables; no new columns.
import type { SupabaseClient } from "@supabase/supabase-js";

export type ConcentrationLevel = "low" | "medium" | "high" | "unknown";

export interface MarketAggregates {
  /** Keyword the aggregates were pulled for, when known. */
  keyword: string | null;
  /** Category guess associated with the keyword (best-effort label). */
  category: string | null;
  /** Day the aggregates were captured / measured (ISO date). */
  asOf: string;
  /** Sample size used to derive the stats. */
  sampleSize: number;
  /** Price stats in ₽. */
  medianPrice: number;
  p25Price: number;
  p75Price: number;
  averagePrice: number;
  /** Review stats. */
  medianReviews: number;
  top10MedianReviews: number;
  /** Seller stats. */
  sellerCount: number;
  /** Share of search volume held by the top-3 sellers (0..1). */
  top3SellerShare: number;
  concentrationLevel: ConcentrationLevel;
  /** Where the numbers came from. */
  source: "daily_market_metrics" | "analysis_competitors" | "wb_product_snapshots";
}

interface CompetitorRow { price_rub: number | null; review_count: number | null }

/** Percentile via linear interpolation. Returns 0 for an empty array. */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function classifyConcentration(top3Share: number): ConcentrationLevel {
  if (!isFinite(top3Share) || top3Share <= 0) return "unknown";
  if (top3Share >= 0.6) return "high";
  if (top3Share >= 0.35) return "medium";
  return "low";
}

/**
 * Pure aggregator. Derives all stats from a list of competitor / snapshot rows.
 * Used as the fallback path when no daily_market_metrics row exists, and as
 * the unit-testable surface for the pricing percentiles + concentration logic.
 */
export function aggregateFromCompetitors(
  rows: CompetitorRow[],
  opts: { sellerColumn?: ReadonlyArray<string | null> } = {},
): Omit<MarketAggregates, "keyword" | "category" | "asOf" | "source"> | null {
  const prices = rows
    .map((r) => Number(r.price_rub ?? 0))
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);
  const reviews = rows
    .map((r) => Number(r.review_count ?? 0))
    .filter((n) => Number.isFinite(n) && n >= 0)
    .sort((a, b) => a - b);
  if (prices.length === 0) return null;

  const medianPrice = percentile(prices, 0.5);
  const p25Price = percentile(prices, 0.25);
  const p75Price = percentile(prices, 0.75);
  const averagePrice = prices.reduce((s, v) => s + v, 0) / prices.length;
  const medianReviews = reviews.length > 0 ? percentile(reviews, 0.5) : 0;
  const top10MedianReviews = reviews.length > 0
    ? percentile(reviews.slice(-Math.max(1, Math.min(10, Math.ceil(reviews.length * 0.1)))), 0.5)
    : 0;

  const sellers = (opts.sellerColumn ?? [])
    .map((s) => (s ?? "").trim().toLowerCase())
    .filter((s) => s);
  const counts = new Map<string, number>();
  for (const s of sellers) counts.set(s, (counts.get(s) ?? 0) + 1);
  const sortedCounts = [...counts.values()].sort((a, b) => b - a);
  const top3 = sortedCounts.slice(0, 3).reduce((s, v) => s + v, 0);
  const top3SellerShare = sellers.length > 0 ? top3 / sellers.length : 0;

  return {
    sampleSize: rows.length,
    medianPrice: Math.round(medianPrice),
    p25Price: Math.round(p25Price),
    p75Price: Math.round(p75Price),
    averagePrice: Math.round(averagePrice),
    medianReviews: Math.round(medianReviews),
    top10MedianReviews: Math.round(top10MedianReviews),
    sellerCount: counts.size,
    top3SellerShare,
    concentrationLevel: classifyConcentration(top3SellerShare),
  };
}

// Use a loose type so the route can pass in either an anon or typed client.
type AnyClient = SupabaseClient<any, any, any>;

/**
 * Loads the most recent daily_market_metrics row for the given keyword (or, if
 * keyword is missing, the most recent row in the category guess). Falls back to
 * aggregating from analysis_competitors when daily metrics are absent for that
 * keyword. Returns null when neither source has anything, so the UI can render
 * an honest "недостаточно данных" state.
 */
export async function loadMarketAggregates(
  supabase: AnyClient,
  opts: { keyword?: string | null; category?: string | null },
): Promise<MarketAggregates | null> {
  const keyword = opts.keyword?.trim() || null;
  const category = opts.category?.trim() || null;

  // 1. Try daily_market_metrics by keyword, latest day.
  if (keyword) {
    const { data } = await supabase
      .from("daily_market_metrics")
      .select("keyword,category_guess,date,product_count,median_price,p25_price,p75_price,average_price,median_reviews,top10_median_reviews,seller_count,top3_seller_share,concentration_level")
      .eq("keyword", keyword)
      .order("date", { ascending: false })
      .limit(1);
    const row = data?.[0] as Record<string, unknown> | undefined;
    if (row) return mapDailyRow(row);
  }

  // 2. Fall back to most-recent daily row for the category guess.
  if (category) {
    const { data } = await supabase
      .from("daily_market_metrics")
      .select("keyword,category_guess,date,product_count,median_price,p25_price,p75_price,average_price,median_reviews,top10_median_reviews,seller_count,top3_seller_share,concentration_level")
      .eq("category_guess", category)
      .order("date", { ascending: false })
      .limit(1);
    const row = data?.[0] as Record<string, unknown> | undefined;
    if (row) return mapDailyRow(row);
  }

  // 3. Fall back to aggregating analysis_competitors filtered by query.
  if (keyword) {
    const { data } = await supabase
      .from("analysis_competitors")
      .select("price_rub,review_count,seller_name,created_at")
      .eq("query", keyword)
      .order("created_at", { ascending: false })
      .limit(200);
    if (data && data.length > 0) {
      const rows = data as Array<{ price_rub: number | null; review_count: number | null; seller_name: string | null; created_at: string }>;
      const agg = aggregateFromCompetitors(rows, { sellerColumn: rows.map((r) => r.seller_name) });
      if (agg) {
        return {
          ...agg,
          keyword,
          category,
          asOf: rows[0]!.created_at.slice(0, 10),
          source: "analysis_competitors",
        };
      }
    }
  }

  return null;
}

function mapDailyRow(row: Record<string, unknown>): MarketAggregates {
  const num = (v: unknown): number => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  const top3SellerShare = num(row.top3_seller_share);
  const level = (row.concentration_level as ConcentrationLevel | null) ?? classifyConcentration(top3SellerShare);
  return {
    keyword: (row.keyword as string | null) ?? null,
    category: (row.category_guess as string | null) ?? null,
    asOf: String(row.date).slice(0, 10),
    sampleSize: num(row.product_count),
    medianPrice: Math.round(num(row.median_price)),
    p25Price: Math.round(num(row.p25_price)),
    p75Price: Math.round(num(row.p75_price)),
    averagePrice: Math.round(num(row.average_price)),
    medianReviews: Math.round(num(row.median_reviews)),
    top10MedianReviews: Math.round(num(row.top10_median_reviews)),
    sellerCount: num(row.seller_count),
    top3SellerShare,
    concentrationLevel: level,
    source: "daily_market_metrics",
  };
}
