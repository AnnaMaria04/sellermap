import "server-only";

import type { WbConnectionStatus } from "@/types/sellermap";

export type WbApiCategory = "content" | "analytics" | "prices" | "common" | "statistics" | "advert";

const WB_BASE_URLS: Record<WbApiCategory, string> = {
  content: "https://content-api.wildberries.ru",
  analytics: "https://seller-analytics-api.wildberries.ru",
  prices: "https://discounts-prices-api.wildberries.ru",
  common: "https://common-api.wildberries.ru",
  statistics: "https://statistics-api.wildberries.ru",
  advert: "https://advert-api.wildberries.ru",
};

export type WbClientResult<T> =
  | { ok: true; data: T; statusCode: number; category: WbApiCategory; rateLimitRemaining?: string | null }
  | {
      ok: false;
      error: string;
      statusCode: number;
      category: WbApiCategory;
      retryAfter?: string | null;
      rateLimitRemaining?: string | null;
    };

function explainStatus(status: number, category: WbApiCategory) {
  if (status === 401) return `WB token is missing or invalid for ${category}.`;
  if (status === 403) return `WB token is missing ${category} category access.`;
  if (status === 404) return `WB ${category} route/resource not found.`;
  if (status === 409) return `WB ${category} request conflict.`;
  if (status === 429) return `WB ${category} rate limited.`;
  if (status >= 500) return `WB ${category} server error.`;
  return `WB ${category} returned status ${status}.`;
}

function queryString(query?: Record<string, string | number | boolean | undefined>) {
  if (!query) return "";
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined) params.set(key, String(value));
  });
  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

export async function wbRequest<T = unknown>(input: {
  category: WbApiCategory;
  path: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
}): Promise<WbClientResult<T>> {
  const token = process.env.WB_API_TOKEN;
  if (!token) {
    return { ok: false, error: "WB_API_TOKEN не задан.", statusCode: 401, category: input.category };
  }

  try {
    const response = await fetch(`${WB_BASE_URLS[input.category]}${input.path}${queryString(input.query)}`, {
      method: input.method ?? "GET",
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
      body: input.body ? JSON.stringify(input.body) : undefined,
      next: { revalidate: 300 },
    });
    const rateLimitRemaining = response.headers.get("x-ratelimit-remaining");
    const retryAfter = response.headers.get("retry-after");

    if (!response.ok) {
      return {
        ok: false,
        error: explainStatus(response.status, input.category),
        statusCode: response.status,
        category: input.category,
        retryAfter,
        rateLimitRemaining,
      };
    }

    const text = await response.text();
    return {
      ok: true,
      data: text ? (JSON.parse(text) as T) : ({} as T),
      statusCode: response.status,
      category: input.category,
      rateLimitRemaining,
    };
  } catch {
    return { ok: false, error: `WB ${input.category} request failed.`, statusCode: 502, category: input.category };
  }
}

export async function wbClient<T>(category: WbApiCategory, path: string, init: RequestInit = {}) {
  return wbRequest<T>({
    category,
    path,
    method: (init.method as "GET" | "POST" | "PUT" | "DELETE" | undefined) ?? "GET",
    body: init.body ? JSON.parse(String(init.body)) : undefined,
  });
}

export async function pingWbCategories(): Promise<WbConnectionStatus> {
  const categories: WbApiCategory[] = ["content", "analytics", "prices", "common", "statistics", "advert"];
  const results = await Promise.all(categories.map((category) => wbRequest({ category, path: "/ping" })));
  const status: WbConnectionStatus = {
    content: false,
    analytics: false,
    prices: false,
    common: false,
    statistics: false,
    advert: false,
    errors: {},
  };
  results.forEach((result) => {
    status[result.category] = result.ok;
    if (!result.ok) status.errors[result.category] = result.error;
  });
  return status;
}

export function getSellerInfo() {
  return wbRequest({ category: "content", path: "/content/v2/cards/error/list" });
}

export function getCommissionTariffs() {
  return wbRequest({ category: "common", path: "/api/v1/tariffs/commission" });
}

export function getBoxTariffs(date: string) {
  return wbRequest({ category: "common", path: "/api/v1/tariffs/box", query: { date } });
}

export function getReturnTariffs(date: string) {
  return wbRequest({ category: "common", path: "/api/v1/tariffs/return", query: { date } });
}

export function getAcceptanceCoefficients(warehouseIds?: string[]) {
  return wbRequest({
    category: "common",
    path: "/api/tariffs/v1/acceptance/coefficients",
    query: { warehouseIDs: warehouseIds?.join(",") },
  });
}

export function getProductCard(input: { nmId?: number; vendorCode?: string }) {
  return wbRequest({
    category: "content",
    path: "/content/v2/get/cards/list",
    method: "POST",
    body: {
      settings: {
        cursor: { limit: 10 },
        filter: {
          ...(input.nmId ? { nmID: input.nmId } : {}),
          ...(input.vendorCode ? { vendorCode: input.vendorCode } : {}),
          withPhoto: -1,
        },
      },
    },
  });
}

export function getPrices(nmIds: number[]) {
  return wbRequest({ category: "prices", path: "/api/v2/list/goods/filter", method: "POST", body: { nmIDs: nmIds } });
}

export function getAnalyticsFunnel(input: unknown) {
  return wbRequest({ category: "analytics", path: "/api/analytics/v3/sales-funnel/products", method: "POST", body: input });
}

export function getSearchAnalytics(input: unknown) {
  return wbRequest({ category: "analytics", path: "/api/v2/search-report/product/search-texts", method: "POST", body: input });
}

export function getStocks(input: unknown) {
  return wbRequest({ category: "analytics", path: "/api/analytics/v1/stocks-report/wb-warehouses", method: "POST", body: input });
}
