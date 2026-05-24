import { chromium, type Page } from "playwright";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { config } from "../config.js";
import type { WBProduct, WorkerSearchResponse } from "../types.js";
import { errorMessage } from "../utils/errors.js";
import { logger } from "../utils/logger.js";
import { buildFetchProxyDispatcher, buildPlaywrightProxy } from "../utils/proxy.js";
import { withTimeout } from "../utils/rate-limit.js";
import { normalizeSearchItem } from "../normalizers/wb-normalizer.js";

const SEARCH_CARD_SELECTOR = "article, .product-card, [data-nm-id], [data-card-index], [class*='product-card']";
const WB_DEST = "-1257786";
const execFileAsync = promisify(execFile);

type CurlSearchOutput = {
  ok?: boolean;
  status?: number;
  products?: unknown[];
  error?: string;
};

function buildSearchApiUrl(query: string, limit: number, page = 1) {
  const params = new URLSearchParams({
    appType: "1",
    curr: "rub",
    dest: WB_DEST,
    lang: "ru",
    page: String(page),
    query,
    resultset: "catalog",
    sort: "popular",
    spp: "30",
    suppressSpellcheck: "false",
    inheritFilters: "false",
    limit: String(limit),
  });
  return `https://u-search.wb.ru/exactmatch/ru/common/v18/search?${params}`;
}

async function fetchPublicSearch(query: string, limit: number): Promise<WBProduct[]> {
  const url = buildSearchApiUrl(query, limit);
  const response = await fetch(url, {
    headers: {
      "User-Agent": config.userAgent || "Mozilla/5.0",
      Accept: "application/json,text/plain,*/*",
      "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
      Origin: "https://www.wildberries.ru",
      Referer: `https://www.wildberries.ru/catalog/0/search.aspx?search=${encodeURIComponent(query)}`,
    },
    signal: AbortSignal.timeout(config.timeoutMs),
    dispatcher: buildFetchProxyDispatcher(),
  } as RequestInit);
  if (!response.ok) {
    const message = response.status === 403 || response.status === 429
      ? `WB u-search v18 returned ${response.status}; cloud IP is likely blocked`
      : `WB u-search v18 returned ${response.status}`;
    throw new Error(message);
  }
  const json = (await response.json()) as { data?: { products?: unknown[] } };
  return (json.data?.products ?? [])
    .map((item, index) => normalizeSearchItem(item, query, index + 1))
    .filter((item): item is WBProduct => Boolean(item))
    .slice(0, limit);
}

async function fetchCurlCffiSearch(query: string, limit: number): Promise<WBProduct[]> {
  const { stdout } = await execFileAsync("python3", ["python/wb_search_curl.py", query, String(limit)], {
    timeout: Math.max(config.timeoutMs, 45000),
    env: process.env,
    maxBuffer: 1024 * 1024 * 5,
  });
  const result = JSON.parse(stdout) as CurlSearchOutput;
  if (!result.ok) {
    throw new Error(result.error ?? `WB curl_cffi search returned ${result.status ?? "unknown"}`);
  }
  return (result.products ?? [])
    .map((item, index) => normalizeSearchItem(item, query, index + 1))
    .filter((item): item is WBProduct => Boolean(item))
    .slice(0, limit);
}

function extractProductsFromPayload(payload: unknown): unknown[] {
  if (!payload || typeof payload !== "object") return [];
  const row = payload as Record<string, unknown>;
  const data = row.data && typeof row.data === "object" ? row.data as Record<string, unknown> : null;
  const candidates = [
    data?.products,
    data?.cards,
    row.products,
    row.cards,
    row.items,
    row.result,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
}

async function evaluateSearchCards(page: Page, limit: number) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await page.evaluate((max) => {
        const cards = [...document.querySelectorAll("article, .product-card, [data-nm-id], [data-card-index], [class*='product-card']")].slice(0, max);
        return cards.map((card) => {
          const root = card as HTMLElement;
          const link = root.querySelector<HTMLAnchorElement>("a[href*='/catalog/']");
          const image = root.querySelector<HTMLImageElement>("img");
          const text = root.innerText;
          const price = root.querySelector("[class*='price'], ins, .price__lower-price")?.textContent ?? text.match(/\d[\d\s]*\s?₽/)?.[0] ?? null;
          const rating = text.match(/\d[,.]\d/)?.[0] ?? null;
          const reviews = text.match(/\d[\d\s]*(?:отзыв|оцен)/i)?.[0] ?? null;
          return {
            url: link?.href ?? null,
            title: link?.textContent?.trim() || image?.alt || text.split("\n").find(Boolean) || "",
            imageUrl: image?.src ?? null,
            price,
            rating,
            reviews,
            nmId: root.dataset.nmId ?? root.getAttribute("data-nm-id") ?? null,
          };
        });
      }, limit);
    } catch (error) {
      lastError = error;
      const message = errorMessage(error);
      if (!/Execution context was destroyed|navigation|Target closed/i.test(message)) throw error;
      await page.waitForLoadState("domcontentloaded", { timeout: 5000 }).catch(() => undefined);
      await page.waitForTimeout(800 + attempt * 700);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Browser DOM extraction failed.");
}

async function collectWithBrowser(query: string, limit: number): Promise<WBProduct[]> {
  const browser = await chromium.launch({
    headless: true,
    proxy: buildPlaywrightProxy(),
  });
  try {
    const page = await browser.newPage({ userAgent: config.userAgent });
    const responseProducts: WBProduct[][] = [];
    page.on("response", async (response) => {
      const url = response.url();
      if (!/u-search\.wb\.ru|search\.wb\.ru|catalog|cards/i.test(url)) return;
      const contentType = response.headers()["content-type"] ?? "";
      if (!contentType.includes("json")) return;
      try {
        const payload = await response.json();
        const products = extractProductsFromPayload(payload)
          .map((item, index) => normalizeSearchItem(item, query, index + 1))
          .filter((item): item is WBProduct => Boolean(item))
          .slice(0, limit);
        if (products.length) responseProducts.push(products);
      } catch {
        // Ignore non-product JSON payloads from the page.
      }
    });
    await page.goto(`https://www.wildberries.ru/catalog/0/search.aspx?search=${encodeURIComponent(query)}`, {
      waitUntil: "domcontentloaded",
      timeout: config.timeoutMs,
    });
    await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => undefined);
    await page.waitForSelector(SEARCH_CARD_SELECTOR, { timeout: 8000 }).catch(() => undefined);
    await page.waitForTimeout(1200);
    if (responseProducts[0]?.length) return responseProducts[0].slice(0, limit);
    const rawItems = await evaluateSearchCards(page, limit);
    return rawItems
      .map((item, index) => normalizeSearchItem(item, query, index + 1))
      .filter((item): item is WBProduct => Boolean(item))
      .slice(0, limit);
  } finally {
    await browser.close();
  }
}

export async function collectWbSearch(query: string, limit: number): Promise<WorkerSearchResponse> {
  const started = Date.now();
  const warnings: string[] = [];
  logger.info({ query, limit }, "SEARCH_STARTED");
  let items: WBProduct[] = [];
  let collector = "curl-cffi";
  try {
    items = await withTimeout(fetchCurlCffiSearch(query, limit), Math.max(config.timeoutMs, 45000));
  } catch (error) {
    warnings.push(`CURL_CFFI_FAILED: ${errorMessage(error)}`);
    try {
      collector = "public-json";
      items = await withTimeout(fetchPublicSearch(query, limit));
    } catch (publicError) {
      warnings.push(`FAST_PATH_FAILED: ${errorMessage(publicError)}`);
      collector = "playwright-dom";
      try {
        items = await withTimeout(collectWithBrowser(query, limit));
        warnings.push("DOM_SELECTOR_FALLBACK_USED");
      } catch (browserError) {
        warnings.push(`BROWSER_FALLBACK_FAILED: ${errorMessage(browserError)}`);
      }
    }
  }

  if (!items.length) warnings.push("NO_RESULTS");
  const status = items.length ? (warnings.length ? "partial" : "success") : "failed";
  logger.info({ query, resultCount: items.length, status }, status === "failed" ? "SEARCH_FAILED" : status === "partial" ? "SEARCH_PARTIAL" : "SEARCH_SUCCESS");
  return {
    status,
    source: "own-wb",
    query,
    items,
    warnings,
    debug: { durationMs: Date.now() - started, collector: items.length ? collector : "failed", resultCount: items.length },
  };
}
