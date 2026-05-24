import type { WBProduct, WBProductDetail } from "@/lib/providers/market/types";

export type WorkerSearchResponse = {
  status: "success" | "partial" | "failed";
  source: "own-wb";
  query: string;
  items: WBProduct[];
  warnings: string[];
};

export type WorkerProductResponse = {
  status: "success" | "partial" | "failed";
  source: "own-wb";
  nmId: string;
  product: WBProductDetail | null;
  warnings: string[];
};

const DEFAULT_TIMEOUT_MS = 55_000;

export function ownCollectorBaseUrl() {
  return process.env.OWN_WB_COLLECTOR_BASE_URL?.replace(/\/$/, "") ?? null;
}

export function ownCollectorApiKey() {
  return process.env.OWN_WB_COLLECTOR_API_KEY ?? null;
}

export function isOwnCollectorEnabled() {
  return process.env.ENABLE_OWN_WB_COLLECTOR !== "false";
}

export function isOwnCollectorConfigured() {
  return Boolean(ownCollectorBaseUrl() && ownCollectorApiKey() && isOwnCollectorEnabled());
}

export async function ownCollectorFetch(path: string, init?: RequestInit, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const base = ownCollectorBaseUrl();
  const key = ownCollectorApiKey();
  if (!base || !key || !isOwnCollectorEnabled()) {
    throw new Error("Own WB collector is not configured.");
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(`${base}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function callOwnCollectorSearch(query: string, limit: number) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await ownCollectorFetch("/search", {
        method: "POST",
        body: JSON.stringify({ query, limit }),
      });
      if (!response.ok) throw new Error(`Own WB collector returned ${response.status}`);
      return (await response.json()) as WorkerSearchResponse;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Own WB collector failed.");
}

export async function callOwnCollectorProduct(nmId: string) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await ownCollectorFetch("/product", {
        method: "POST",
        body: JSON.stringify({ nmId }),
      });
      if (!response.ok) throw new Error(`Own WB collector returned ${response.status}`);
      return (await response.json()) as WorkerProductResponse;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Own WB collector product lookup failed.");
}
