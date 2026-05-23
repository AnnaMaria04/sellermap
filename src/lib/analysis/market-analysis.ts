import type { ProductFingerprint } from "@/lib/analysis/product-fingerprint";
import type { WBProduct } from "@/lib/providers/market/types";
import type { SupplierProduct } from "@/lib/providers/supplier/types";

export type MarketAnalysis = {
  competitors: WBProduct[];
  priceStats: {
    min: number | null;
    p25: number | null;
    median: number | null;
    average: number | null;
    p75: number | null;
    max: number | null;
  };
  reviewStats: {
    min: number | null;
    median: number | null;
    average: number | null;
    p75: number | null;
    max: number | null;
    top10Median: number | null;
    entryReviewBarrier: "low" | "medium" | "high" | "unknown";
  };
  sellerConcentration: {
    sellerCount: number;
    topSellerShareByCount: number | null;
    top3SellerShareByCount: number | null;
    top5SellerShareByCount: number | null;
    concentrationLevel: "low" | "medium" | "high" | "unknown";
    topSellers: Array<{ sellerName: string; productCount: number; estimatedSalesShare?: number | null }>;
  };
  demand: {
    demandScore: number;
    demandLevel: "low" | "medium" | "high" | "unknown";
    estimatedMonthlySalesRange?: { low: number; high: number; method: "provider" | "review_velocity" | "proxy" } | null;
    demandSignals: string[];
  };
  competition: {
    competitionScore: number;
    competitionLevel: "low" | "medium" | "high" | "unknown";
    reasons: string[];
  };
  confidenceLevel: "low" | "medium" | "high";
  warnings: string[];
};

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function percentile(values: number[], p: number) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * p)))];
}

function average(values: number[]) {
  return values.length ? Math.round(values.reduce((sum, item) => sum + item, 0) / values.length) : null;
}

function levelFromScore(score: number): "low" | "medium" | "high" {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

function dedupe(products: WBProduct[]) {
  const seen = new Map<string, WBProduct>();
  for (const product of products) {
    const key = product.nmId || `${product.title}:${product.priceRub}`;
    if (!seen.has(key)) seen.set(key, product);
  }
  return [...seen.values()];
}

function comparable(product: WBProduct, fingerprint: ProductFingerprint) {
  const title = product.title.toLowerCase();
  const terms = [fingerprint.productType, ...fingerprint.ruKeywords, ...fingerprint.keyFeatures]
    .join(" ")
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 2);
  if (!terms.length) return true;
  return terms.some((term) => title.includes(term));
}

function priceStats(products: WBProduct[]) {
  const prices = products.map((item) => item.priceRub).filter((item): item is number => Number.isFinite(item ?? NaN) && Number(item) > 0);
  return {
    min: prices.length ? Math.min(...prices) : null,
    p25: percentile(prices, 0.25),
    median: median(prices),
    average: average(prices),
    p75: percentile(prices, 0.75),
    max: prices.length ? Math.max(...prices) : null,
  };
}

function reviewStats(products: WBProduct[]) {
  const reviews = products.map((item) => item.reviewCount ?? 0).filter((item) => Number.isFinite(item));
  const top10Median = median([...reviews].sort((a, b) => b - a).slice(0, 10));
  const entryReviewBarrier: MarketAnalysis["reviewStats"]["entryReviewBarrier"] = !top10Median ? "unknown" : top10Median > 1500 ? "high" : top10Median > 300 ? "medium" : "low";
  return {
    min: reviews.length ? Math.min(...reviews) : null,
    median: median(reviews),
    average: average(reviews),
    p75: percentile(reviews, 0.75),
    max: reviews.length ? Math.max(...reviews) : null,
    top10Median,
    entryReviewBarrier,
  };
}

function sellerConcentration(products: WBProduct[]): MarketAnalysis["sellerConcentration"] {
  const counts = new Map<string, number>();
  for (const product of products) {
    const seller = product.sellerName || "Неизвестный продавец";
    counts.set(seller, (counts.get(seller) ?? 0) + 1);
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const total = products.length || 1;
  const share = (count: number) => Math.round((count / total) * 100);
  const topSellerShareByCount = sorted[0] ? share(sorted[0][1]) : null;
  const top3SellerShareByCount = sorted.length ? share(sorted.slice(0, 3).reduce((sum, [, count]) => sum + count, 0)) : null;
  const top5SellerShareByCount = sorted.length ? share(sorted.slice(0, 5).reduce((sum, [, count]) => sum + count, 0)) : null;
  const concentrationLevel = !products.length ? "unknown" : (top3SellerShareByCount ?? 0) >= 55 ? "high" : (top3SellerShareByCount ?? 0) >= 30 ? "medium" : "low";
  return {
    sellerCount: counts.size,
    topSellerShareByCount,
    top3SellerShareByCount,
    top5SellerShareByCount,
    concentrationLevel,
    topSellers: sorted.slice(0, 5).map(([sellerName, productCount]) => ({ sellerName, productCount, estimatedSalesShare: null })),
  };
}

export function analyzeMarket(
  supplier: SupplierProduct,
  fingerprint: ProductFingerprint,
  rawProducts: WBProduct[],
): MarketAnalysis {
  const deduped = dedupe(rawProducts);
  const comparableProducts = deduped.filter((product) => comparable(product, fingerprint));
  const competitors = (comparableProducts.length >= 5 ? comparableProducts : deduped)
    .filter((product) => product.priceRub !== null || deduped.every((item) => item.priceRub === null))
    .slice(0, 100);
  const prices = priceStats(competitors);
  const reviews = reviewStats(competitors);
  const sellers = sellerConcentration(competitors);
  const reviewDepth = Math.min(30, Math.round(((reviews.top10Median ?? 0) / 2500) * 30));
  const searchStrength = Math.min(25, Math.round((competitors.filter((item) => (item.searchPosition ?? 999) <= 30).length / 30) * 25));
  const activeProducts = Math.min(15, Math.round((competitors.length / 60) * 15));
  const trust = Math.min(10, Math.round((competitors.filter((item) => (item.rating ?? 0) >= 4.6).length / Math.max(competitors.length, 1)) * 10));
  const priceHealth = prices.median && supplier.supplierPriceMin ? Math.min(10, prices.median > supplier.supplierPriceMin * 3 ? 10 : 5) : 5;
  const completeness = competitors.length >= 20 ? 10 : competitors.length >= 5 ? 6 : 2;
  const demandScore = Math.min(100, reviewDepth + searchStrength + activeProducts + trust + priceHealth + completeness);

  const barrierRisk = reviews.top10Median ? Math.min(35, Math.round((reviews.top10Median / 2500) * 35)) : 15;
  const concentrationRisk = sellers.concentrationLevel === "high" ? 25 : sellers.concentrationLevel === "medium" ? 15 : 8;
  const priceCompression = prices.p25 && prices.p75 && prices.median ? Math.max(0, 20 - Math.round(((prices.p75 - prices.p25) / prices.median) * 20)) : 10;
  const strongProducts = Math.min(20, competitors.filter((item) => (item.reviewCount ?? 0) > 500 && (item.rating ?? 0) >= 4.7).length * 2);
  const competitionScore = Math.min(100, barrierRisk + concentrationRisk + priceCompression + strongProducts);

  const providerSales = competitors.map((item) => item.estimatedMonthlySales).filter((item): item is number => Number.isFinite(item ?? NaN));
  const estimatedMonthlySalesRange = providerSales.length
    ? { low: Math.min(...providerSales), high: providerSales.reduce((sum, item) => sum + item, 0), method: "provider" as const }
    : null;
  const warnings = [
    ...(!estimatedMonthlySalesRange ? ["Точные месячные продажи недоступны от текущего провайдера; используется прокси спроса."] : []),
    ...(competitors.length < 5 ? ["Недостаточно похожих товаров для уверенного анализа рынка."] : []),
  ];

  return {
    competitors,
    priceStats: prices,
    reviewStats: reviews,
    sellerConcentration: sellers,
    demand: {
      demandScore,
      demandLevel: competitors.length ? levelFromScore(demandScore) : "unknown",
      estimatedMonthlySalesRange,
      demandSignals: [
        `Проанализировано конкурентов: ${competitors.length}`,
        reviews.top10Median ? `Медиана отзывов топ-10: ${reviews.top10Median}` : "Отзывы недоступны",
        prices.median ? `Медианная цена: ${prices.median} ₽` : "Цены недоступны",
      ],
    },
    competition: {
      competitionScore,
      competitionLevel: competitors.length ? levelFromScore(competitionScore) : "unknown",
      reasons: [
        `Барьер отзывов: ${reviews.entryReviewBarrier}`,
        `Концентрация продавцов: ${sellers.concentrationLevel}`,
        `Сильных карточек: ${strongProducts / 2}`,
      ],
    },
    confidenceLevel: competitors.length >= 30 ? "high" : competitors.length >= 10 ? "medium" : "low",
    warnings,
  };
}
