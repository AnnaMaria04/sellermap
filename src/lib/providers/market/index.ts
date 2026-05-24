import "server-only";

import { searchSimilarProducts } from "@/services/marketDataProvider";
import type { CompetitorProduct } from "@/types/sellermap";
import type { WBProduct } from "@/lib/providers/market/types";

export function toWBProduct(product: CompetitorProduct, keyword: string): WBProduct {
  return {
    nmId: String(product.nmId ?? ""),
    title: product.title,
    brand: product.brand,
    sellerName: product.sellerName,
    priceRub: product.price,
    rating: product.rating,
    reviewCount: product.reviewCount,
    imageUrl: product.image,
    productUrl: product.url,
    searchKeyword: product.searchKeyword ?? keyword,
    searchPosition: product.searchPosition,
    stockSignal: product.stockSignal,
    estimatedMonthlySales: product.estimatedSales,
    estimatedMonthlyRevenue: product.estimatedRevenue,
    source:
      product.source === "cache"
        ? "cache"
        : product.source === "mpstats"
          ? "mpstats"
          : product.source === "own-wb"
            ? "own-wb"
            : product.source === "wb_public"
              ? "direct-wb"
              : "apify",
    raw: product,
  };
}

export async function searchMarketProducts(keywords: string[], limit = 50) {
  const providersUsed: string[] = [];
  const warnings: string[] = [];
  const productsByNmId = new Map<string, WBProduct>();
  const keywordLimit = Number(process.env.CHECK_MODE === "internal" ? process.env.INTERNAL_MAX_KEYWORDS ?? 5 : process.env.FREE_USER_MAX_KEYWORDS ?? 1);
  const resultLimit = Number(
    process.env.CHECK_MODE === "internal"
      ? process.env.INTERNAL_MAX_RESULTS_PER_KEYWORD ?? limit
      : process.env.FREE_USER_MAX_RESULTS_PER_KEYWORD ?? Math.min(limit, 20),
  );

  for (const keyword of keywords.map((item) => item.trim()).filter(Boolean).slice(0, keywordLimit)) {
    const result = await searchSimilarProducts(keyword, { limit: Math.min(limit, resultLimit) });
    providersUsed.push(result.provider);
    warnings.push(...result.warnings);
    for (const product of result.competitors) {
      const normalized = toWBProduct(product, keyword);
      const key = normalized.nmId || `${normalized.title}:${normalized.priceRub}`;
      if (!productsByNmId.has(key)) productsByNmId.set(key, normalized);
    }
  }

  return {
    products: [...productsByNmId.values()].slice(0, limit),
    providersUsed: [...new Set(providersUsed)],
    warnings: [...new Set(warnings)],
  };
}
