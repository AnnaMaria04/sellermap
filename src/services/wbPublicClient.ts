import "server-only";

import type { CompetitorProduct, MarketAnalysisResult, MarketStats } from "@/types/sellermap";

const WB_DEST = "-1257786";
const WB_REGIONS = "80,38,83,4,64,33,68,70,30,40,86,75,69,22,1,31,66,110,48,71,114";

type WbRawProduct = Record<string, unknown>;

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function priceRub(product: WbRawProduct, keys: string[]) {
  for (const key of keys) {
    const value = asNumber(product[key]);
    if (value !== null) return Math.round(value / 100);
  }
  return null;
}

function firstProductPayload(data: unknown): WbRawProduct | null {
  const record = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  const direct = Array.isArray(record.products) ? record.products[0] : null;
  const nestedData = record.data && typeof record.data === "object" ? (record.data as Record<string, unknown>) : {};
  const nested = Array.isArray(nestedData.products) ? nestedData.products[0] : null;
  return (direct ?? nested ?? null) as WbRawProduct | null;
}

export function getWbImageUrl(nmId: number) {
  const vol = Math.floor(nmId / 100000);
  const part = Math.floor(nmId / 1000);
  const basket =
    vol <= 143 ? "01" :
    vol <= 287 ? "02" :
    vol <= 431 ? "03" :
    vol <= 719 ? "04" :
    vol <= 1007 ? "05" :
    vol <= 1061 ? "06" :
    vol <= 1115 ? "07" :
    vol <= 1169 ? "08" :
    vol <= 1313 ? "09" :
    vol <= 1601 ? "10" :
    vol <= 1655 ? "11" :
    vol <= 1919 ? "12" :
    vol <= 2045 ? "13" :
    vol <= 2189 ? "14" :
    vol <= 2405 ? "15" :
    "16";
  return `https://basket-${basket}.wbbasket.ru/vol${vol}/part${part}/${nmId}/images/big/1.webp`;
}

export function normalizeWbProduct(product: WbRawProduct): CompetitorProduct {
  const nmId = asNumber(product.id) ?? asNumber(product.nmId);
  return {
    nmId,
    title: String(product.name ?? product.title ?? "Товар WB"),
    brand: typeof product.brand === "string" ? product.brand : null,
    sellerName: typeof product.supplier === "string" ? product.supplier : typeof product.seller === "string" ? product.seller : null,
    price: priceRub(product, ["salePriceU", "salePrice", "priceU"]) ?? asNumber(product.price),
    rating: asNumber(product.reviewRating) ?? asNumber(product.nmReviewRating) ?? asNumber(product.rating),
    reviewCount: asNumber(product.feedbacks) ?? asNumber(product.nmFeedbacks) ?? asNumber(product.reviews) ?? asNumber(product.reviewCount),
    estimatedSales: null,
    estimatedRevenue: null,
    image: nmId ? getWbImageUrl(nmId) : null,
    url: nmId ? `https://www.wildberries.ru/catalog/${nmId}/detail.aspx` : null,
    source: "wb_public",
  };
}

export async function searchWbPublicProducts(query: string, limit = 30): Promise<CompetitorProduct[]> {
  if (!query.trim()) return [];
  const encoded = encodeURIComponent(query);
  const res = await fetch(
    `https://search.wb.ru/exactmatch/ru/common/v9/search?query=${encoded}&resultset=catalog&limit=${limit}&sort=popular&curr=rub&lang=ru&dest=${WB_DEST}`,
    {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 300 },
    },
  );

  const contentType = res.headers.get("content-type") ?? "";
  if (!res.ok) throw new Error(`WB public search failed: ${res.status}`);
  if (!contentType.includes("application/json")) {
    throw new Error("WB public search returned anti-bot/HTML response instead of JSON.");
  }
  const data = await res.json();
  const products = Array.isArray(data?.data?.products) ? data.data.products : [];
  return products.map((product: WbRawProduct) => normalizeWbProduct(product));
}

async function getWbBasketProduct(nmId: number): Promise<CompetitorProduct | null> {
  const vol = Math.floor(nmId / 100000);
  const part = Math.floor(nmId / 1000);
  const host = new URL(getWbImageUrl(nmId)).host;
  const res = await fetch(`https://${host}/vol${vol}/part${part}/${nmId}/info/ru/card.json`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) return null;
  const product = await res.json();
  return {
    nmId,
    title: String(product.imt_name ?? product.nm_name ?? "Товар WB"),
    brand: typeof product.selling?.brand_name === "string" ? product.selling.brand_name : null,
    sellerName: typeof product.selling?.supplier_name === "string" ? product.selling.supplier_name : null,
    price: null,
    rating: null,
    reviewCount: null,
    estimatedSales: null,
    estimatedRevenue: null,
    image: getWbImageUrl(nmId),
    url: `https://www.wildberries.ru/catalog/${nmId}/detail.aspx`,
    source: "wb_public",
  };
}

export async function getWbPublicProduct(nmId: number): Promise<CompetitorProduct | null> {
  const urls = [
    `https://card.wb.ru/cards/v4/detail?appType=1&curr=rub&dest=${WB_DEST}&spp=30&nm=${nmId}`,
    `https://card.wb.ru/cards/v2/detail?appType=1&curr=rub&dest=${WB_DEST}&regions=${WB_REGIONS}&spp=30&nm=${nmId}`,
  ];

  for (const url of urls) {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 300 },
    });
    if (!res.ok || !(res.headers.get("content-type") ?? "").includes("application/json")) continue;
    const data = await res.json();
    const product = firstProductPayload(data);
    if (product) return normalizeWbProduct(product);
  }

  return getWbBasketProduct(nmId);
}

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function publicMarketStats(competitors: CompetitorProduct[]): MarketStats {
  const prices = competitors.map((item) => item.price).filter((value): value is number => typeof value === "number");
  const reviews = competitors.map((item) => item.reviewCount).filter((value): value is number => typeof value === "number");
  const topReviews = [...reviews].sort((a, b) => b - a).slice(0, 10);
  const averageReviews = reviews.length ? Math.round(reviews.reduce((sum, item) => sum + item, 0) / reviews.length) : null;
  const reviewBarrier = topReviews.length ? Math.round(topReviews.reduce((sum, item) => sum + item, 0) / topReviews.length * 0.3) : null;
  const competitorCount = competitors.length;
  const marketDifficulty =
    (reviewBarrier ?? 0) > 1200 || competitorCount > 60 ? "high" :
    (reviewBarrier ?? 0) > 300 || competitorCount > 20 ? "medium" :
    competitorCount ? "low" :
    "unknown";

  return {
    averagePrice: prices.length ? Math.round(prices.reduce((sum, item) => sum + item, 0) / prices.length) : null,
    medianPrice: median(prices),
    minPrice: prices.length ? Math.min(...prices) : null,
    maxPrice: prices.length ? Math.max(...prices) : null,
    averageReviews,
    reviewBarrier,
    competitorCount,
    topSellerShare: null,
    marketDifficulty,
  };
}

export async function getWbPublicMarketByKeyword(keyword: string, limit = 100): Promise<MarketAnalysisResult> {
  try {
    const competitors = await searchWbPublicProducts(keyword, limit);
    if (!competitors.length) {
      return {
        provider: "wb_public",
        status: "failed",
        competitors: [],
        marketStats: null,
        warnings: ["Публичный поиск WB не вернул товары по этому запросу."],
      };
    }

    const marketStats = publicMarketStats(competitors);
    return {
      provider: "wb_public",
      status: "success",
      competitors,
      marketStats,
      warnings: [
        "Источник: публичный каталог WB. Продажи и выручка не рассчитываются без MPStats или другого аналитического провайдера.",
      ],
    };
  } catch (error) {
    return {
      provider: "wb_public",
      status: "failed",
      competitors: [],
      marketStats: null,
      warnings: [error instanceof Error ? error.message : "Публичный WB поиск недоступен."],
    };
  }
}

export async function getWbPublicMarketByNmId(nmId: number): Promise<MarketAnalysisResult> {
  const product = await getWbPublicProduct(nmId);
  if (!product) {
    return {
      provider: "wb_public",
      status: "failed",
      competitors: [],
      marketStats: null,
      warnings: ["Товар WB не найден."],
    };
  }
  return getWbPublicMarketByKeyword(product.title, 50);
}
