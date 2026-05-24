import { supabaseRest } from "@/services/supabaseRest";
import {
  calculatePriceChangeFromHistory,
  calculateRankChangeFromHistory,
  calculateReviewGrowthFromHistory,
  type ProductHistorySnapshot,
} from "@/lib/analysis/historical-metrics-core";

export { calculatePriceChangeFromHistory, calculateRankChangeFromHistory, calculateReviewGrowthFromHistory };
export type { ProductHistorySnapshot };

export async function getProductHistory(nmId: string, days = 30) {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  return supabaseRest<ProductHistorySnapshot[]>("wb_product_snapshots", {
    query: {
      select: "nm_id,query,price_rub,review_count,search_position,stock_signal,created_at",
      nm_id: `eq.${nmId}`,
      created_at: `gte.${since}`,
      order: "created_at.asc",
      limit: "500",
    },
  });
}

export async function calculateReviewGrowth(nmId: string, days = 30) {
  const history = await getProductHistory(nmId, days);
  return history.ok ? calculateReviewGrowthFromHistory(history.data) : null;
}

export async function calculatePriceChange(nmId: string, days = 30) {
  const history = await getProductHistory(nmId, days);
  return history.ok ? calculatePriceChangeFromHistory(history.data) : null;
}

export async function calculateRankChange(nmId: string, keyword: string, days = 30) {
  const history = await getProductHistory(nmId, days);
  return history.ok ? calculateRankChangeFromHistory(history.data, keyword) : null;
}

export async function calculateSellerTrend(sellerName: string, days = 30) {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  return supabaseRest<Array<{ nm_id: string; created_at: string }>>("wb_product_snapshots", {
    query: {
      select: "nm_id,created_at",
      seller_name: `eq.${sellerName}`,
      created_at: `gte.${since}`,
      order: "created_at.asc",
      limit: "1000",
    },
  });
}

export async function calculateKeywordMarketMetrics(keyword: string, days = 30) {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  return supabaseRest("daily_market_metrics", {
    query: {
      select: "*",
      keyword: `eq.${keyword}`,
      created_at: `gte.${since}`,
      order: "date.asc",
      limit: "200",
    },
  });
}
