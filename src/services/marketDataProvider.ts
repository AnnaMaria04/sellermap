import type { MarketAnalysisResult } from "@/types/sellermap";

export type MarketDataProviderName = "mpstats" | "moneyplace" | "mayak" | "demo" | "none";

function emptyMarket(status: MarketAnalysisResult["status"], warning: string): MarketAnalysisResult {
  return {
    provider: process.env.MPSTATS_API_KEY ? "mpstats" : "none",
    status,
    competitors: [],
    marketStats: {
      averagePrice: null,
      medianPrice: null,
      minPrice: null,
      maxPrice: null,
      topSellerShare: null,
      averageReviews: null,
      reviewBarrier: null,
    },
    warnings: [warning],
  };
}

export async function getCompetitorsByKeyword(keyword: string): Promise<MarketAnalysisResult> {
  void keyword;
  if (!process.env.MPSTATS_API_KEY) {
    return emptyMarket("not_configured", "MPStats не подключён. Данные конкурентов недоступны.");
  }
  return emptyMarket("failed", "MPStats adapter подготовлен, но реальный endpoint ещё не настроен.");
}

export const getCompetitorsByNmId = getCompetitorsByKeyword;
export const getMarketPrices = getCompetitorsByKeyword;
export const getSellerConcentration = getCompetitorsByKeyword;
export const getReviewBarrier = getCompetitorsByKeyword;
export const getTopSellers = getCompetitorsByKeyword;
export const getSearchDemand = getCompetitorsByKeyword;
