import { chromium, type Page } from "playwright";
import { config } from "../config.js";
import type { WBProductDetail, WorkerProductResponse } from "../types.js";
import { buildWBProductUrl, normalizePriceRub, normalizeRating, normalizeReviewCount, normalizeSearchItem } from "../normalizers/wb-normalizer.js";
import { errorMessage } from "../utils/errors.js";
import { logger } from "../utils/logger.js";
import { withTimeout } from "../utils/rate-limit.js";

async function fetchPublicProduct(nmId: string): Promise<WBProductDetail | null> {
  const response = await fetch(`https://card.wb.ru/cards/v2/detail?appType=1&curr=rub&dest=-1257786&spp=30&nm=${nmId}`, {
    headers: { "User-Agent": config.userAgent, Accept: "application/json,text/plain,*/*" },
    signal: AbortSignal.timeout(config.timeoutMs),
  });
  if (!response.ok) throw new Error(`WB public product returned ${response.status}`);
  const json = (await response.json()) as { data?: { products?: unknown[] } };
  const product = normalizeSearchItem(json.data?.products?.[0], "", 1);
  if (!product) return null;
  return { ...product, images: product.imageUrl ? [product.imageUrl] : [], specs: null, description: null };
}

async function evaluateProductPage(page: Page) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await page.evaluate(() => {
        const text = document.body.innerText;
        const title = document.querySelector("h1")?.textContent ?? document.title;
        const images = [...document.querySelectorAll<HTMLImageElement>("img")].map((img) => img.src).filter(Boolean).slice(0, 12);
        const specs: Record<string, string> = {};
        for (const row of [...document.querySelectorAll("tr, dl, li")]) {
          const rowText = (row as HTMLElement).innerText?.replace(/\s+/g, " ").trim();
          if (!rowText || rowText.length > 120 || !/[:\n]/.test(rowText)) continue;
          const [key, ...rest] = rowText.split(/:|\n/).map((item) => item.trim()).filter(Boolean);
          if (key && rest[0]) specs[key] = rest.join(" ");
        }
        return {
          title,
          price: text.match(/\d[\d\s]*\s?₽/)?.[0] ?? null,
          rating: text.match(/\d[,.]\d/)?.[0] ?? null,
          reviews: text.match(/\d[\d\s]*(?:отзыв|оцен)/i)?.[0] ?? null,
          images,
          specs,
          description: document.querySelector("[class*='description'], .product-page__description")?.textContent?.trim() ?? null,
        };
      });
    } catch (error) {
      lastError = error;
      const message = errorMessage(error);
      if (!/Execution context was destroyed|navigation|Target closed/i.test(message)) throw error;
      await page.waitForLoadState("domcontentloaded", { timeout: 5000 }).catch(() => undefined);
      await page.waitForTimeout(800 + attempt * 700);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Browser product extraction failed.");
}

async function collectProductWithBrowser(nmId: string): Promise<WBProductDetail | null> {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ userAgent: config.userAgent });
    const productUrl = buildWBProductUrl(nmId);
    await page.goto(productUrl, { waitUntil: "domcontentloaded", timeout: config.timeoutMs });
    await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => undefined);
    await page.waitForSelector("h1, [class*='product'], img", { timeout: 8000 }).catch(() => undefined);
    await page.waitForTimeout(1200);
    const raw = await evaluateProductPage(page);
    const base = normalizeSearchItem({ ...raw, nmId, imageUrl: raw.images[0], url: productUrl }, "", 1);
    if (!base) return null;
    return {
      ...base,
      priceRub: normalizePriceRub(raw.price) ?? base.priceRub,
      rating: normalizeRating(raw.rating) ?? base.rating,
      reviewCount: normalizeReviewCount(raw.reviews) ?? base.reviewCount,
      images: raw.images,
      specs: raw.specs,
      description: raw.description,
    };
  } finally {
    await browser.close();
  }
}

export async function collectWbProduct(nmId: string): Promise<WorkerProductResponse> {
  const started = Date.now();
  const warnings: string[] = [];
  logger.info({ nmId }, "PRODUCT_STARTED");
  let product: WBProductDetail | null = null;
  let collector = "public-json";
  try {
    product = await withTimeout(fetchPublicProduct(nmId));
  } catch (error) {
    warnings.push(`FAST_PATH_FAILED: ${errorMessage(error)}`);
    collector = "playwright-dom";
    try {
      product = await withTimeout(collectProductWithBrowser(nmId));
      warnings.push("DOM_SELECTOR_FALLBACK_USED");
    } catch (browserError) {
      warnings.push(`BROWSER_FALLBACK_FAILED: ${errorMessage(browserError)}`);
    }
  }
  const status = product ? (warnings.length ? "partial" : "success") : "failed";
  logger.info({ nmId, status }, product ? "PRODUCT_SUCCESS" : "PRODUCT_FAILED");
  return { status, source: "own-wb", nmId, product, warnings, debug: { durationMs: Date.now() - started, collector: product ? collector : "failed" } };
}
