import type { CompetitorProduct, MarketAnalysisResult, MarketStats } from "@/types/sellermap";
import { getMpstatsItems } from "@/services/mpstatsClient";

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
    const price = item.price && typeof item.price === "object" ? (item.price as Record<string, unknown>) : {};
    const stats = item.period_stats && typeof item.period_stats === "object" ? (item.period_stats as Record<string, unknown>) : {};
    const brand = item.brand && typeof item.brand === "object" ? (item.brand as Record<string, unknown>) : {};
    const seller = item.seller && typeof item.seller === "object" ? (item.seller as Record<string, unknown>) : {};
    return {
      nmId: typeof item.nmId === "number" ? item.nmId : typeof item.id === "number" ? item.id : null,
      title: String(item.title ?? item.name ?? "WB competitor"),
      brand: typeof item.brand === "string" ? item.brand : typeof brand.name === "string" ? brand.name : null,
      sellerName: typeof item.sellerName === "string" ? item.sellerName : typeof seller.name === "string" ? seller.name : null,
      price: typeof item.price === "number" ? item.price : typeof price.final_price === "number" ? Math.round(price.final_price / 100) : null,
      rating: typeof item.rating === "number" ? item.rating : null,
      reviewCount: typeof item.reviewCount === "number" ? item.reviewCount : typeof item.comments === "number" ? item.comments : null,
      estimatedSales: typeof item.estimatedSales === "number" ? item.estimatedSales : typeof stats.sales === "number" ? stats.sales : null,
      estimatedRevenue: typeof item.estimatedRevenue === "number" ? item.estimatedRevenue : typeof stats.revenue === "number" ? stats.revenue : null,
      image: typeof item.image === "string" ? item.image : typeof item.thumb === "string" ? item.thumb : null,
      url: typeof item.url === "string" ? item.url : typeof item.link === "string" ? item.link : null,
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
  const result = await getMpstatsItems({ market: "wb", keyword, startRow: 0, endRow: 30 });
  if (!result.ok) {
    return { provider: "mpstats", status: result.status === "not_configured" ? "not_configured" : "failed", competitors: [], marketStats: null, warnings: [result.error] };
  }
  const competitors = normalizeMpstatsResponse(result.data);
  return { provider: "mpstats", status: "success", competitors, marketStats: getMarketStats(competitors), warnings: [] };
}

export async function getCompetitorsByNmId(nmId: number) {
  if (!process.env.MPSTATS_API_KEY) return notConfigured();
  const result = await getMpstatsItems({ market: "wb", ids: String(nmId), startRow: 0, endRow: 30 });
  if (!result.ok) {
    return { provider: "mpstats", status: result.status === "not_configured" ? "not_configured" : "failed", competitors: [], marketStats: null, warnings: [result.error] };
  }
  const competitors = normalizeMpstatsResponse(result.data);
  return { provider: "mpstats", status: "success", competitors, marketStats: getMarketStats(competitors), warnings: [] };
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
