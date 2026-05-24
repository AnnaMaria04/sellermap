import { calculateHistoricalConfidence } from "@/lib/analysis/confidence-score";

export type ProductSnapshotForEstimate = {
  nm_id: string;
  price_rub: number | null;
  review_count: number | null;
  search_position?: number | null;
  stock_signal?: number | null;
  created_at: string;
};

export type SalesEstimate = {
  nmId: string;
  method:
    | "seller_api_exact"
    | "provider_estimate"
    | "review_velocity_estimate"
    | "stock_delta_estimate"
    | "proxy_only";
  estimatedSalesLow: number | null;
  estimatedSalesMid: number | null;
  estimatedSalesHigh: number | null;
  estimatedRevenueLow: number | null;
  estimatedRevenueHigh: number | null;
  confidenceLevel: "low" | "medium" | "high";
  explanation: string;
  features: Record<string, unknown>;
};

function daysBetween(a: string, b: string) {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 86_400_000;
}

export function estimateSalesFromReviewVelocity(input: {
  nmId: string;
  currentReviews: number;
  previousReviews: number;
  priceRub: number | null;
  daysOfHistory: number;
  snapshotCount: number;
}): SalesEstimate {
  const reviewGrowth = Math.max(0, input.currentReviews - input.previousReviews);
  const low = reviewGrowth * 5;
  const mid = reviewGrowth * 10;
  const high = reviewGrowth * 20;
  const confidence = calculateHistoricalConfidence({
    daysOfHistory: input.daysOfHistory,
    snapshotCount: input.snapshotCount,
    competitorsAnalyzed: 1,
    hasReviewGrowth: reviewGrowth > 0,
    hasRankHistory: false,
    hasStockSignal: false,
    source: "own-wb",
  });

  return {
    nmId: input.nmId,
    method: "review_velocity_estimate",
    estimatedSalesLow: low,
    estimatedSalesMid: mid,
    estimatedSalesHigh: high,
    estimatedRevenueLow: input.priceRub ? low * input.priceRub : null,
    estimatedRevenueHigh: input.priceRub ? high * input.priceRub : null,
    confidenceLevel: confidence.level,
    explanation: "Оценка построена по росту отзывов. Это диапазон, не официальные продажи WB.",
    features: {
      reviewGrowth,
      daysOfHistory: input.daysOfHistory,
      snapshotCount: input.snapshotCount,
      priceRub: input.priceRub,
      multipliers: [5, 10, 20],
    },
  };
}

export function proxyOnlyEstimate(nmId: string, reason = "Истории отзывов пока недостаточно."): SalesEstimate {
  return {
    nmId,
    method: "proxy_only",
    estimatedSalesLow: null,
    estimatedSalesMid: null,
    estimatedSalesHigh: null,
    estimatedRevenueLow: null,
    estimatedRevenueHigh: null,
    confidenceLevel: "low",
    explanation: `${reason} Показываем только прокси спроса, без чисел продаж.`,
    features: {},
  };
}

export function estimateSalesFromSnapshots(nmId: string, snapshots: ProductSnapshotForEstimate[]): SalesEstimate {
  const ordered = [...snapshots]
    .filter((snapshot) => snapshot.review_count !== null)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  if (ordered.length < 2) return proxyOnlyEstimate(nmId, "Нужно минимум два снимка товара.");

  const first = ordered[0];
  const last = ordered[ordered.length - 1];
  const historyDays = daysBetween(first.created_at, last.created_at);
  if (historyDays < 7) return proxyOnlyEstimate(nmId, "История меньше 7 дней.");

  return estimateSalesFromReviewVelocity({
    nmId,
    currentReviews: last.review_count ?? 0,
    previousReviews: first.review_count ?? 0,
    priceRub: last.price_rub,
    daysOfHistory: Math.round(historyDays),
    snapshotCount: ordered.length,
  });
}
