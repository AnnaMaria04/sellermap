import type { CompetitorProduct, MarketAnalysisResult, MarketStats } from "@/types/sellermap";

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

export function calculateReviewBarrier(competitors: CompetitorProduct[]) {
  const reviews = competitors
    .map((item) => item.reviewCount)
    .filter((value): value is number => typeof value === "number")
    .sort((a, b) => b - a);
  if (!reviews.length) return null;
  return reviews[Math.min(2, reviews.length - 1)];
}

export function calculateMarketDifficulty(stats: MarketStats): MarketStats["marketDifficulty"] {
  if (!stats.competitorCount) return "unknown";
  if ((stats.reviewBarrier ?? 0) > 1200 || stats.competitorCount > 40) return "high";
  if ((stats.reviewBarrier ?? 0) > 300 || stats.competitorCount > 15) return "medium";
  return "low";
}

export function getMarketStats(competitors: CompetitorProduct[]): MarketStats {
  const prices = competitors.map((item) => item.price).filter((value): value is number => typeof value === "number");
  const reviews = competitors.map((item) => item.reviewCount).filter((value): value is number => typeof value === "number");
  const base: MarketStats = {
    averagePrice: prices.length ? Math.round(prices.reduce((sum, item) => sum + item, 0) / prices.length) : null,
    medianPrice: median(prices),
    minPrice: prices.length ? Math.min(...prices) : null,
    maxPrice: prices.length ? Math.max(...prices) : null,
    averageReviews: reviews.length ? Math.round(reviews.reduce((sum, item) => sum + item, 0) / reviews.length) : null,
    reviewBarrier: calculateReviewBarrier(competitors),
    competitorCount: competitors.length,
    topSellerShare: null,
    marketDifficulty: "unknown",
  };
  return { ...base, marketDifficulty: calculateMarketDifficulty(base) };
}

export function normalizeMpstatsResponse(raw: unknown): CompetitorProduct[] {
  const rows = Array.isArray(raw) ? raw : Array.isArray((raw as { data?: unknown[] })?.data) ? (raw as { data: unknown[] }).data : [];
  return rows.map((row) => {
    const item = row as Record<string, unknown>;
    return {
      nmId: typeof item.nmId === "number" ? item.nmId : null,
      title: String(item.title ?? item.name ?? "WB competitor"),
      brand: typeof item.brand === "string" ? item.brand : null,
      sellerName: typeof item.sellerName === "string" ? item.sellerName : null,
      price: typeof item.price === "number" ? item.price : null,
      rating: typeof item.rating === "number" ? item.rating : null,
      reviewCount: typeof item.reviewCount === "number" ? item.reviewCount : null,
      estimatedSales: typeof item.estimatedSales === "number" ? item.estimatedSales : null,
      estimatedRevenue: typeof item.estimatedRevenue === "number" ? item.estimatedRevenue : null,
      image: typeof item.image === "string" ? item.image : null,
      url: typeof item.url === "string" ? item.url : null,
      source: "mpstats" as const,
    };
  });
}

function notConfigured(): MarketAnalysisResult {
  return {
    provider: "none",
    status: "not_configured",
    competitors: [],
    marketStats: null,
    warnings: ["MPStats API is not configured."],
  };
}

export async function getCompetitorsByKeyword(keyword: string): Promise<MarketAnalysisResult> {
  if (!process.env.MPSTATS_API_KEY) return notConfigured();
  void keyword;
  return {
    provider: "mpstats",
    status: "failed",
    competitors: [],
    marketStats: null,
    warnings: ["MPStats adapter is ready, but endpoint mapping is not configured yet."],
  };
}

export async function getCompetitorsByNmId(nmId: number) {
  return getCompetitorsByKeyword(String(nmId));
}

export function buildManualMarketAnalysis(competitors: CompetitorProduct[]): MarketAnalysisResult {
  return {
    provider: "manual",
    status: "success",
    competitors,
    marketStats: getMarketStats(competitors),
    warnings: ["Данные конкурентов введены вручную."],
  };
}

export const getMarketPrices = getCompetitorsByKeyword;
export const getSellerConcentration = getCompetitorsByKeyword;
export const getReviewBarrier = getCompetitorsByKeyword;
export const getTopSellers = getCompetitorsByKeyword;
export const getSearchDemand = getCompetitorsByKeyword;
