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
    rating: asNumber(product.reviewRating) ?? asNumber(product.rating),
    reviewCount: asNumber(product.feedbacks) ?? asNumber(product.reviews) ?? asNumber(product.reviewCount),
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

  if (!res.ok) throw new Error(`WB public search failed: ${res.status}`);
  const data = await res.json();
  const products = Array.isArray(data?.data?.products) ? data.data.products : [];
  return products.map((product: WbRawProduct) => normalizeWbProduct(product));
}

export async function getWbPublicProduct(nmId: number): Promise<CompetitorProduct | null> {
  const res = await fetch(
    `https://card.wb.ru/cards/v2/detail?appType=1&curr=rub&dest=${WB_DEST}&regions=${WB_REGIONS}&spp=30&nm=${nmId}`,
    {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 300 },
    },
  );
  if (!res.ok) throw new Error(`WB public product failed: ${res.status}`);
  const data = await res.json();
  const product = data?.data?.products?.[0];
  return product ? normalizeWbProduct(product) : null;
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
