import "server-only";

import { ApifyClient } from "apify-client";
import type { CompetitorProduct, MarketAnalysisResult, MarketStats, ProviderHealth } from "@/types/sellermap";
import { ownWbCollectorProvider } from "@/lib/providers/market/own-wb-collector-provider";
import type { WBProduct } from "@/lib/providers/market/types";
import { getMpstatsItems } from "@/services/mpstatsClient";
import { getWbImageUrl, getWbPublicMarketByKeyword, getWbPublicMarketByNmId } from "@/services/wbPublicClient";
import { isSupabaseConfigured, supabaseRest } from "@/services/supabaseRest";

type SearchOptions = { limit?: number; allowDirectFallback?: boolean; allowDemoFallback?: boolean };
type SnapshotRow = {
  id?: string;
  keyword: string;
  provider: string;
  products: CompetitorProduct[];
  market_stats?: MarketStats | null;
  created_at: string;
};

const WB_SEARCH_ACTOR = process.env.APIFY_WB_SEARCH_ACTOR_ID ?? "stealth_mode/wildberries-product-search-scraper";
const CACHE_TTL_HOURS = Number(process.env.MARKET_DATA_CACHE_TTL_HOURS ?? 72);
const ENABLE_DIRECT_WB = process.env.ENABLE_DIRECT_WB_PROVIDER === "true";
const MARKET_PROVIDER = process.env.MARKET_DATA_PROVIDER ?? "auto";
const ENABLE_APIFY_FALLBACK = process.env.ENABLE_APIFY_FALLBACK === "true";

function apifyToken() {
  return process.env.APIFY_TOKEN ?? process.env.APIFY_API_TOKEN;
}

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function percentile(values: number[], p: number) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * p)));
  return sorted[index];
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

export function priceStatsWithQuartiles(competitors: CompetitorProduct[]) {
  const prices = competitors.map((item) => item.price).filter((value): value is number => typeof value === "number").sort((a, b) => a - b);
  return {
    min: prices[0] ?? null,
    p25: percentile(prices, 0.25),
    median: median(prices),
    average: prices.length ? Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length) : null,
    p75: percentile(prices, 0.75),
    max: prices.at(-1) ?? null,
  };
}

function normalizeNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/\s/g, "").replace(/[^\d.,-]/g, "").replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function pick(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return null;
}

function normalizeApifyRows(raw: unknown[], keyword: string): CompetitorProduct[] {
  return raw.map((entry, index) => {
    const row = (entry && typeof entry === "object" ? entry : {}) as Record<string, unknown>;
    const sizes = Array.isArray(row.sizes) ? row.sizes : [];
    const firstSize = sizes[0] && typeof sizes[0] === "object" ? sizes[0] as Record<string, unknown> : {};
    const sizePrice = firstSize.price && typeof firstSize.price === "object" ? firstSize.price as Record<string, unknown> : {};
    const priceObject = pick(row, ["price", "salePrice", "finalPrice"]);
    const seller = pick(row, ["seller", "supplier", "sellerInfo"]);
    const sellerRecord = seller && typeof seller === "object" ? seller as Record<string, unknown> : {};
    const nmId = normalizeNumber(pick(row, ["nmId", "id", "productId", "sku", "article"]));
    const price =
      typeof priceObject === "object" && priceObject !== null
        ? normalizeNumber(pick(priceObject as Record<string, unknown>, ["value", "amount", "price", "sale", "current"]))
        : normalizeNumber(priceObject ?? pick(row, ["priceRub", "salePriceRub", "currentPrice", "discountPrice"]))
          ?? (normalizeNumber(pick(sizePrice, ["product", "basic"])) ? Math.round(Number(normalizeNumber(pick(sizePrice, ["product", "basic"]))) / 100) : null);
    return {
      nmId,
      title: String(pick(row, ["title", "name", "productName"]) ?? "Товар WB"),
      brand: typeof pick(row, ["brand", "brandName"]) === "string" ? String(pick(row, ["brand", "brandName"])) : null,
      sellerName: String(pick(row, ["sellerName", "supplierName"]) ?? sellerRecord.name ?? sellerRecord.supplierName ?? "") || null,
      price,
      rating: normalizeNumber(pick(row, ["rating", "reviewRating", "review_rating", "nm_review_rating", "stars"])),
      reviewCount: normalizeNumber(pick(row, ["reviewCount", "reviews", "feedbacks", "nm_feedbacks", "comments"])),
      estimatedSales: normalizeNumber(pick(row, ["estimatedMonthlySales", "sales", "sales30d", "orders"])),
      estimatedRevenue: normalizeNumber(pick(row, ["estimatedRevenue", "revenue", "revenue30d"])),
      image: typeof pick(row, ["image", "imageUrl", "img", "thumbnail", "photo"]) === "string" ? String(pick(row, ["image", "imageUrl", "img", "thumbnail", "photo"])) : nmId ? getWbImageUrl(nmId) : null,
      url: typeof pick(row, ["url", "productUrl", "link"]) === "string" ? String(pick(row, ["url", "productUrl", "link"])) : nmId ? `https://www.wildberries.ru/catalog/${nmId}/detail.aspx` : null,
      source: "apify" as const,
      searchKeyword: keyword,
      searchPosition: index + 1,
      stockSignal: normalizeNumber(pick(row, ["stock", "stockSignal", "quantity", "totalQuantity", "total_quantity"])),
    } as CompetitorProduct;
  }).filter((product) => product.title !== "Товар WB" || product.nmId || product.price);
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

function analysisFrom(provider: MarketAnalysisResult["provider"], competitors: CompetitorProduct[], warnings: string[]): MarketAnalysisResult {
  return {
    provider,
    status: competitors.length ? "success" : "failed",
    competitors,
    marketStats: competitors.length ? getMarketStats(competitors) : null,
    warnings,
  };
}

function ownWbToCompetitor(product: WBProduct): CompetitorProduct {
  return {
    nmId: Number.isFinite(Number(product.nmId)) ? Number(product.nmId) : null,
    title: product.title,
    brand: product.brand,
    sellerName: product.sellerName,
    price: product.priceRub,
    rating: product.rating,
    reviewCount: product.reviewCount,
    estimatedSales: product.estimatedMonthlySales,
    estimatedRevenue: product.estimatedMonthlyRevenue,
    image: product.imageUrl,
    url: product.productUrl,
    searchKeyword: product.searchKeyword,
    searchPosition: product.searchPosition,
    stockSignal: product.stockSignal,
    source: "own-wb",
  };
}

function demoCompetitors(keyword: string): CompetitorProduct[] {
  const lower = keyword.toLowerCase();
  if (/ламп|светиль/.test(lower)) {
    return [
      { nmId: 9001001, title: "Настольная LED лампа с диммером", brand: "LumiHome", sellerName: "WB seller", price: 899, rating: 4.8, reviewCount: 1840, image: null, url: null, source: "demo", searchKeyword: keyword, searchPosition: 1 },
      { nmId: 9001002, title: "Светильник настольный USB", brand: "LightDesk", sellerName: "WB seller", price: 1190, rating: 4.7, reviewCount: 930, image: null, url: null, source: "demo", searchKeyword: keyword, searchPosition: 2 },
      { nmId: 9001003, title: "LED лампа для рабочего стола", brand: "HomePro", sellerName: "WB seller", price: 749, rating: 4.6, reviewCount: 520, image: null, url: null, source: "demo", searchKeyword: keyword, searchPosition: 3 },
      { nmId: 9001004, title: "Настольная лампа с аккумулятором", brand: "Bright", sellerName: "WB seller", price: 1390, rating: 4.9, reviewCount: 2280, image: null, url: null, source: "demo", searchKeyword: keyword, searchPosition: 4 },
    ];
  }
  if (/рюкзак/.test(lower)) {
    return [
      { nmId: 9002001, title: "Рюкзак городской 30 л", brand: "UrbanPack", sellerName: "WB seller", price: 1890, rating: 4.8, reviewCount: 3120, image: null, url: null, source: "demo", searchKeyword: keyword, searchPosition: 1 },
      { nmId: 9002002, title: "Водонепроницаемый рюкзак", brand: "TravelWay", sellerName: "WB seller", price: 2390, rating: 4.7, reviewCount: 1560, image: null, url: null, source: "demo", searchKeyword: keyword, searchPosition: 2 },
      { nmId: 9002003, title: "Рюкзак для ноутбука 30 л", brand: "DailyBag", sellerName: "WB seller", price: 1690, rating: 4.6, reviewCount: 880, image: null, url: null, source: "demo", searchKeyword: keyword, searchPosition: 3 },
    ];
  }
  if (/чехол|iphone|телефон/.test(lower)) {
    return [
      { nmId: 9003001, title: "Прозрачный чехол для iPhone", brand: "CaseLab", sellerName: "WB seller", price: 249, rating: 4.8, reviewCount: 8200, image: null, url: null, source: "demo", searchKeyword: keyword, searchPosition: 1 },
      { nmId: 9003002, title: "Силиконовый чехол iPhone", brand: "SoftCase", sellerName: "WB seller", price: 319, rating: 4.7, reviewCount: 5400, image: null, url: null, source: "demo", searchKeyword: keyword, searchPosition: 2 },
      { nmId: 9003003, title: "Чехол противоударный iPhone", brand: "Armor", sellerName: "WB seller", price: 490, rating: 4.6, reviewCount: 2200, image: null, url: null, source: "demo", searchKeyword: keyword, searchPosition: 3 },
    ];
  }
  return [
    { nmId: 9004001, title: "Игрушка антистресс поп-ит", brand: "ToyMix", sellerName: "WB seller", price: 199, rating: 4.8, reviewCount: 4200, image: null, url: null, source: "demo", searchKeyword: keyword, searchPosition: 1 },
    { nmId: 9004002, title: "Поп-ит силиконовый", brand: "KidsFun", sellerName: "WB seller", price: 149, rating: 4.7, reviewCount: 3100, image: null, url: null, source: "demo", searchKeyword: keyword, searchPosition: 2 },
    { nmId: 9004003, title: "Антистресс игрушка набор", brand: "HappyToy", sellerName: "WB seller", price: 299, rating: 4.5, reviewCount: 980, image: null, url: null, source: "demo", searchKeyword: keyword, searchPosition: 3 },
  ];
}

function failure(provider: MarketAnalysisResult["provider"], warning: string): MarketAnalysisResult {
  return { provider, status: "failed", competitors: [], marketStats: null, warnings: [warning] };
}

function providerErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "провайдер недоступен";
  if (/monthly usage hard limit exceeded/i.test(message)) {
    return "Apify WB provider недоступен: превышен месячный лимит аккаунта.";
  }
  return `Apify WB provider недоступен: ${message}`;
}

async function readCachedSnapshot(keyword: string): Promise<MarketAnalysisResult | null> {
  if (!isSupabaseConfigured()) return null;
  const since = new Date(Date.now() - CACHE_TTL_HOURS * 60 * 60 * 1000).toISOString();
  const result = await supabaseRest<SnapshotRow[]>("wb_search_snapshots", {
    query: {
      select: "keyword,provider,products,market_stats,created_at",
      keyword: `eq.${keyword}`,
      created_at: `gte.${since}`,
      order: "created_at.desc",
      limit: "1",
    },
  });
  if (!result.ok || !result.data[0]) return null;
  const row = result.data[0];
  return {
    provider: "cache",
    status: "success",
    competitors: row.products ?? [],
    marketStats: row.market_stats ?? getMarketStats(row.products ?? []),
    warnings: [`Кэш WB: ${row.provider}, обновлено ${new Date(row.created_at).toLocaleString("ru-RU")}`],
  };
}

async function writeCachedSnapshot(keyword: string, provider: string, competitors: CompetitorProduct[], marketStats: MarketStats | null) {
  if (!isSupabaseConfigured() || !competitors.length) return;
  await supabaseRest("wb_search_snapshots", {
    method: "POST",
    body: JSON.stringify({ keyword, query: keyword, provider, products: competitors, market_stats: marketStats, result_count: competitors.length, raw_payload: competitors }),
  });
  await supabaseRest("wb_product_snapshots", {
    method: "POST",
    body: JSON.stringify(
      competitors
        .filter((product) => product.nmId)
        .map((product) => ({
          nm_id: String(product.nmId),
          query: product.searchKeyword ?? keyword,
          provider,
          title: product.title,
          brand: product.brand,
          seller_name: product.sellerName,
          price_rub: product.price,
          rating: product.rating,
          review_count: product.reviewCount,
          image_url: product.image,
          product_url: product.url,
          search_position: product.searchPosition,
          stock_signal: product.stockSignal,
          estimated_monthly_sales: product.estimatedSales,
          product,
          raw_payload: product,
        })),
    ),
  });
}

async function ownCollectorSearchSimilarProducts(keyword: string, options: SearchOptions = {}): Promise<MarketAnalysisResult> {
  try {
    const products = await ownWbCollectorProvider.searchSimilarProducts(keyword, { limit: options.limit ?? 50 });
    const competitors = products.map(ownWbToCompetitor);
    const marketStats = getMarketStats(competitors);
    await writeCachedSnapshot(keyword, "own-wb", competitors, marketStats);
    return analysisFrom("own-wb", competitors, [
      "Источник: собственный WB collector. Точные продажи конкурентов не извлекаются; используем прокси спроса по цене, отзывам и позиции.",
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : "own WB collector недоступен";
    return { provider: "own-wb", status: "failed", competitors: [], marketStats: null, warnings: [`Own WB collector недоступен: ${message}`] };
  }
}

function apifyPayload(keyword: string, limit: number) {
  const searchUrl = `https://www.wildberries.ru/catalog/0/search.aspx?search=${encodeURIComponent(keyword)}`;
  return {
    // stealth_mode/wildberries-product-search-scraper expects these fields.
    urls: [searchUrl],
    max_items_per_url: limit,
    ignore_url_failures: true,
    // Keep common aliases so another WB actor can be swapped via APIFY_WB_SEARCH_ACTOR_ID.
    query: keyword,
    keyword,
    search: keyword,
    searchQuery: keyword,
    startUrls: [{ url: searchUrl }],
    searchUrls: [{ url: searchUrl }],
    maxItems: limit,
    limit,
    proxyConfiguration: { useApifyProxy: true },
  };
}

async function apifySearchSimilarProducts(keyword: string, options: SearchOptions = {}): Promise<MarketAnalysisResult> {
  const token = apifyToken();
  if (!token) return { provider: "apify", status: "not_configured", competitors: [], marketStats: null, warnings: ["APIFY_TOKEN/APIFY_API_TOKEN не задан."] };
  const client = new ApifyClient({ token });
  try {
    const run = await client.actor(WB_SEARCH_ACTOR).call(apifyPayload(keyword, options.limit ?? 50), { timeout: 90 });
    if (!run.defaultDatasetId) return failure("apify", "Apify WB actor did not return a dataset.");
    const { items } = await client.dataset(run.defaultDatasetId).listItems({ limit: options.limit ?? 50 });
    const competitors = normalizeApifyRows(items as unknown[], keyword);
    const marketStats = getMarketStats(competitors);
    await writeCachedSnapshot(keyword, "apify", competitors, marketStats);
    return analysisFrom("apify", competitors, ["Источник: Apify WB provider. Продажи показываются только если их возвращает провайдер; иначе используем прокси спроса по отзывам, цене и позициям."]);
  } catch (error) {
    return failure("apify", providerErrorMessage(error));
  }
}

async function mpstatsSearchSimilarProducts(keyword: string): Promise<MarketAnalysisResult> {
  const result = await getMpstatsItems({ market: "wb", keyword, startRow: 0, endRow: 50 });
  if (!result.ok) {
    return { provider: "mpstats", status: result.status === "not_configured" ? "not_configured" : "failed", competitors: [], marketStats: null, warnings: [result.error] };
  }
  const competitors = normalizeMpstatsResponse(result.data);
  const marketStats = getMarketStats(competitors);
  await writeCachedSnapshot(keyword, "mpstats", competitors, marketStats);
  return { provider: "mpstats", status: "success", competitors, marketStats, warnings: [] };
}

export async function getMarketProviderHealth(): Promise<ProviderHealth[]> {
  const ownHealth = await ownWbCollectorProvider.getProviderHealth?.();
  return [
    { provider: "cache", ok: isSupabaseConfigured(), status: isSupabaseConfigured() ? "ready" : "not_configured", message: isSupabaseConfigured() ? undefined : "Supabase cache is not configured." },
    {
      provider: "own-wb",
      ok: Boolean(ownHealth?.available),
      status: ownHealth?.status ?? "not_configured",
      message: ownHealth?.message,
    },
    { provider: "apify", ok: Boolean(apifyToken()) && ENABLE_APIFY_FALLBACK, status: apifyToken() ? (ENABLE_APIFY_FALLBACK ? "ready" : "disabled") : "not_configured", message: apifyToken() ? WB_SEARCH_ACTOR : "APIFY_TOKEN/APIFY_API_TOKEN missing." },
    { provider: "mpstats", ok: Boolean(process.env.MPSTATS_API_KEY ?? process.env.MPSTATS_API_TOKEN), status: (process.env.MPSTATS_API_KEY ?? process.env.MPSTATS_API_TOKEN) ? "ready" : "not_configured" },
    { provider: "wb_public", ok: ENABLE_DIRECT_WB, status: ENABLE_DIRECT_WB ? "ready" : "disabled", message: "Direct WB search is unstable and disabled by default in production." },
  ];
}

export async function searchSimilarProducts(keyword: string, options: SearchOptions = {}): Promise<MarketAnalysisResult> {
  const clean = keyword.trim();
  if (!clean) return { provider: "none", status: "not_configured", competitors: [], marketStats: null, warnings: ["Keyword is empty."] };

  const cached = await readCachedSnapshot(clean);
  if (cached) return cached;

  const providersTried: string[] = ["cache"];

  if (MARKET_PROVIDER === "mpstats") {
    providersTried.push("mpstats");
    const mpstats = await mpstatsSearchSimilarProducts(clean);
    if (mpstats.status === "success") return mpstats;
  }

  if (MARKET_PROVIDER === "own-wb" || MARKET_PROVIDER === "auto" || MARKET_PROVIDER === "apify") {
    providersTried.push("own-wb");
    const own = await ownCollectorSearchSimilarProducts(clean, options);
    if (own.status === "success") return { ...own, warnings: [...own.warnings, `Провайдеры проверены: ${providersTried.join(" → ")}`] };
  }

  let apify: MarketAnalysisResult = { provider: "apify", status: "failed", competitors: [], marketStats: null, warnings: ["Apify fallback skipped."] };
  if (ENABLE_APIFY_FALLBACK) {
    providersTried.push("apify");
    apify = await apifySearchSimilarProducts(clean, options);
    if (apify.status === "success") return { ...apify, warnings: ["APIFY_FALLBACK_USED", ...apify.warnings, `Провайдеры проверены: ${providersTried.join(" → ")}`] };
  }

  if (MARKET_PROVIDER === "mpstats") return apify;

  if (process.env.MPSTATS_API_KEY ?? process.env.MPSTATS_API_TOKEN) {
    providersTried.push("mpstats");
    const mpstats = await mpstatsSearchSimilarProducts(clean);
    if (mpstats.status === "success") return mpstats;
  }

  if (ENABLE_DIRECT_WB || options.allowDirectFallback) {
    try {
      const direct = await getWbPublicMarketByKeyword(clean, options.limit ?? 50);
      if (direct.status === "success") {
        direct.warnings.unshift(
          options.allowDirectFallback
            ? "Демо-режим: Apify недоступен, использован прямой публичный поиск WB как тестовый fallback."
            : "Direct WB search is unstable and may be blocked.",
        );
        return direct;
      }
      if (!options.allowDemoFallback) return direct;
    } catch (error) {
      const detail = error instanceof Error ? error.message : "прямой поиск WB недоступен";
      if (!options.allowDemoFallback) {
        return failure("wb_public", `Публичный fallback WB не сработал: ${detail}`);
      }
    }
  }

  if (options.allowDemoFallback) {
    return analysisFrom("demo", demoCompetitors(clean), [
      "Демо-данные рынка WB: реальные провайдеры недоступны, этот слой нужен только для тестирования интерфейса и экономики.",
    ]);
  }

  return {
    provider: "none",
    status: apify.status === "not_configured" ? "not_configured" : "failed",
    competitors: [],
    marketStats: null,
    warnings: [
      ...apify.warnings,
      `Провайдеры проверены: ${providersTried.join(" → ")}`,
      "Direct WB search is disabled. Configure OWN_WB_COLLECTOR_BASE_URL/OWN_WB_COLLECTOR_API_KEY, Supabase cache, Apify fallback, MPStats, or enter competitors manually.",
    ],
  };
}

export async function getCompetitorsByKeyword(keyword: string, options: SearchOptions = {}): Promise<MarketAnalysisResult> {
  return searchSimilarProducts(keyword, {
    limit: options.limit ?? 50,
    allowDirectFallback: options.allowDirectFallback,
    allowDemoFallback: options.allowDemoFallback,
  });
}

export async function getCompetitorsByNmId(nmId: number) {
  if (process.env.MPSTATS_API_KEY ?? process.env.MPSTATS_API_TOKEN) {
    const result = await getMpstatsItems({ market: "wb", ids: String(nmId), startRow: 0, endRow: 30 });
    if (result.ok) {
      const competitors = normalizeMpstatsResponse(result.data);
      return { provider: "mpstats", status: "success" as const, competitors, marketStats: getMarketStats(competitors), warnings: [] };
    }
  }
  if (ENABLE_DIRECT_WB) return getWbPublicMarketByNmId(nmId);
  return { provider: "none", status: "not_configured" as const, competitors: [], marketStats: null, warnings: ["WB nmId competitor lookup requires MPStats or direct WB fallback enabled."] };
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
