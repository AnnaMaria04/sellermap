import type { WBProduct } from "@/lib/providers/market/types";

function finite(values: Array<number | null | undefined>) {
  return values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
}

function sorted(values: number[]) {
  return [...values].sort((a, b) => a - b);
}

export function median(values: number[]) {
  if (!values.length) return null;
  const data = sorted(values);
  const mid = Math.floor(data.length / 2);
  return data.length % 2 ? data[mid] : Math.round((data[mid - 1] + data[mid]) / 2);
}

export function percentile(values: number[], p: number) {
  if (!values.length) return null;
  const data = sorted(values);
  const index = Math.min(data.length - 1, Math.max(0, Math.floor((data.length - 1) * p)));
  return data[index];
}

export function calculateDailyMarketMetrics(keyword: string, products: WBProduct[], categoryGuess?: string | null) {
  const prices = finite(products.map((product) => product.priceRub));
  const reviews = finite(products.map((product) => product.reviewCount));
  const sellerCounts = new Map<string, number>();

  for (const product of products) {
    const seller = product.sellerName?.trim();
    if (seller) sellerCounts.set(seller, (sellerCounts.get(seller) ?? 0) + 1);
  }

  const sellerShares = [...sellerCounts.values()].sort((a, b) => b - a);
  const top3Count = sellerShares.slice(0, 3).reduce((sum, item) => sum + item, 0);
  const top3Share = products.length ? Number((top3Count / products.length).toFixed(3)) : null;
  const concentrationLevel =
    top3Share === null
      ? "unknown"
      : top3Share > 0.55
        ? "high"
        : top3Share > 0.32
          ? "medium"
          : "low";

  return {
    keyword,
    category_guess: categoryGuess ?? null,
    date: new Date().toISOString().slice(0, 10),
    product_count: products.length,
    median_price: median(prices),
    average_price: prices.length ? Math.round(prices.reduce((sum, item) => sum + item, 0) / prices.length) : null,
    p25_price: percentile(prices, 0.25),
    p75_price: percentile(prices, 0.75),
    median_reviews: median(reviews),
    top10_median_reviews: median(sorted(reviews).slice(-10)),
    seller_count: sellerCounts.size,
    top3_seller_share: top3Share,
    concentration_level: concentrationLevel,
    raw_metrics: {
      source: "sellermap_daily_metrics",
      priceCount: prices.length,
      reviewCount: reviews.length,
      topSellers: [...sellerCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([sellerName, productCount]) => ({ sellerName, productCount })),
    },
  };
}
