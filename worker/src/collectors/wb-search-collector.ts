import { chromium } from "playwright";
import { config } from "../config.js";
import type { WBProduct, WorkerSearchResponse } from "../types.js";
import { errorMessage } from "../utils/errors.js";
import { logger } from "../utils/logger.js";
import { withTimeout } from "../utils/rate-limit.js";
import { normalizeSearchItem } from "../normalizers/wb-normalizer.js";

async function fetchPublicSearch(query: string, limit: number): Promise<WBProduct[]> {
  const url = `https://search.wb.ru/exactmatch/ru/common/v9/search?query=${encodeURIComponent(query)}&resultset=catalog&limit=${limit}&sort=popular&curr=rub&lang=ru&dest=-1257786`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": config.userAgent,
      Accept: "application/json,text/plain,*/*",
    },
    signal: AbortSignal.timeout(config.timeoutMs),
  });
  if (!response.ok) throw new Error(`WB public search returned ${response.status}`);
  const json = (await response.json()) as { data?: { products?: unknown[] } };
  return (json.data?.products ?? [])
    .map((item, index) => normalizeSearchItem(item, query, index + 1))
    .filter((item): item is WBProduct => Boolean(item))
    .slice(0, limit);
}

async function collectWithBrowser(query: string, limit: number): Promise<WBProduct[]> {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ userAgent: config.userAgent });
    await page.goto(`https://www.wildberries.ru/catalog/0/search.aspx?search=${encodeURIComponent(query)}`, {
      waitUntil: "domcontentloaded",
      timeout: config.timeoutMs,
    });
    await page.waitForTimeout(2500);
    const rawItems = await page.evaluate((max) => {
      const cards = [...document.querySelectorAll("article, .product-card, [data-nm-id], [data-card-index]")].slice(0, max);
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
        };
      });
    }, limit);
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
  try {
    let items: WBProduct[] = [];
    let collector = "public-json";
    try {
      items = await withTimeout(fetchPublicSearch(query, limit));
    } catch (error) {
      warnings.push(`FAST_PATH_FAILED: ${errorMessage(error)}`);
      collector = "playwright-dom";
      items = await withTimeout(collectWithBrowser(query, limit));
      warnings.push("DOM_SELECTOR_FALLBACK_USED");
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
      debug: { durationMs: Date.now() - started, collector, resultCount: items.length },
    };
  } catch (error) {
    logger.error({ query, error: errorMessage(error) }, "SEARCH_FAILED");
    return {
      status: "failed",
      source: "own-wb",
      query,
      items: [],
      warnings: ["SEARCH_FAILED", errorMessage(error)],
      debug: { durationMs: Date.now() - started, collector: "failed", resultCount: 0 },
    };
  }
}
