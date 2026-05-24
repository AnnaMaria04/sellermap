import { chromium } from "playwright";
import { config } from "../config.js";
import type { SupplierRawProduct, WorkerSupplierResponse } from "../types.js";
import { errorMessage } from "../utils/errors.js";
import { logger } from "../utils/logger.js";
import { buildPlaywrightProxy } from "../utils/proxy.js";
import { withTimeout } from "../utils/rate-limit.js";
import {
  currencyFromText,
  normalizeWhitespace,
  numberFromText,
  parseDimensionsCm,
  parsePriceTiers,
  parseWeightKg,
  valueAfterAnyLabel,
} from "../normalizers/supplier-normalizer.js";

const PACKAGE_LABELS = [
  "Single package size",
  "Package size",
  "Package dimensions",
  "Packaging size",
  "Carton size",
  "Box size",
  "产品包装尺寸",
  "包装尺寸",
];

const WEIGHT_LABELS = [
  "Single gross weight",
  "Gross weight",
  "Package weight",
  "Unit weight",
  "毛重",
  "单件毛重",
];

const PRICE_SELECTORS = "[class*='price'], [class*='Price'], [data-spm-anchor-id], .price";

function platformFromUrl(url: string): WorkerSupplierResponse["platform"] {
  const host = new URL(url).hostname.toLowerCase();
  if (host.includes("alibaba.com")) return "alibaba";
  if (host.includes("1688.com")) return "1688";
  if (host.includes("aliexpress.com")) return "aliexpress";
  return "unknown";
}

function fallbackTitleFromUrl(url: string) {
  try {
    const path = new URL(url).pathname;
    const slug = path.match(/product-detail\/([^/]+?)(?:[_-]\d+)?\.html/i)?.[1] ?? path.match(/item\/([^/]+?)(?:[_-]\d+)?\.html/i)?.[1];
    return slug ? slug.replace(/[-_]+/g, " ").trim() : null;
  } catch {
    return null;
  }
}

function extractMoq(text: string) {
  const moq =
    valueAfterAnyLabel(text, ["Min. order", "Min order", "MOQ", "Minimum order", "Min. Order", "Мин. заказ"]) ??
    text.match(/(\d+)\s*(?:pieces|piece|pcs|units|шт)/i)?.[0] ??
    null;
  return numberFromText(moq);
}

function extractShipping(text: string) {
  const value = valueAfterAnyLabel(text, ["Shipping", "Freight", "Delivery", "Estimated shipping", "Logistics"]);
  return numberFromText(value);
}

async function collectRenderedSupplier(url: string): Promise<SupplierRawProduct> {
  const browser = await chromium.launch({
    headless: true,
    proxy: buildPlaywrightProxy(),
  });
  try {
    const page = await browser.newPage({
      userAgent: config.userAgent || "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124 Safari/537.36",
      locale: "en-US",
    });

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: config.timeoutMs });
    await page.waitForLoadState("networkidle", { timeout: 12000 }).catch(() => undefined);
    await page.waitForTimeout(1500);

    const bodyText = await page.locator("body").innerText({ timeout: 5000 }).catch(() => "");
    const h1Title = await page.locator("h1").first().textContent({ timeout: 3000 }).catch(() => null);
    const ogTitle = await page.locator("meta[property='og:title'], meta[name='og:title']").first().getAttribute("content").catch(() => null);
    const pageTitle = await page.title().catch(() => null);
    const imageLocator = page.locator("img");
    const imageCount = Math.min(await imageLocator.count().catch(() => 0), 30);
    const images: string[] = [];
    for (let index = 0; index < imageCount; index += 1) {
      const src = await imageLocator.nth(index).getAttribute("src").catch(() => null);
      const currentSrc = await imageLocator.nth(index).getAttribute("currentSrc").catch(() => null);
      const value = currentSrc || src;
      if (value && /^https?:\/\//i.test(value) && !images.includes(value)) images.push(value);
    }
    const priceText = (await page.locator(PRICE_SELECTORS).allTextContents().catch(() => []))
      .map(normalizeWhitespace)
      .filter(Boolean)
      .slice(0, 20)
      .join(" | ");
    const rowTexts = (await page.locator("tr, [class*='spec'], [class*='attribute'], [class*='Attr'], [class*='Packaging']").allTextContents().catch(() => []))
      .map(normalizeWhitespace)
      .filter(Boolean)
      .slice(0, 120);
    const tablePairs: Array<[string, string]> = rowTexts
      .map((row) => {
        const parts = row.split(/\t|\n| {2,}|：|:/).map(normalizeWhitespace).filter(Boolean);
        return parts.length >= 2 ? [parts[0], parts.slice(1).join(" ")] as [string, string] : null;
      })
      .filter((item): item is [string, string] => Boolean(item));
    const raw = {
      text: bodyText,
      title: h1Title || ogTitle || pageTitle,
      images: images.slice(0, 12),
      priceText,
      tablePairs,
    };

    const text = normalizeWhitespace(raw.text);
    const specs = Object.fromEntries(
      raw.tablePairs
        .map(([key, value]) => [normalizeWhitespace(key).replace(/[:：]$/, ""), normalizeWhitespace(value)] as [string, string])
        .filter(([key, value]) => key.length >= 2 && value.length >= 1)
        .slice(0, 80),
    );

    const packageSize =
      Object.entries(specs).find(([key]) => PACKAGE_LABELS.some((label) => key.toLowerCase().includes(label.toLowerCase())))?.[1] ??
      valueAfterAnyLabel(text, PACKAGE_LABELS);
    const grossWeight =
      Object.entries(specs).find(([key]) => WEIGHT_LABELS.some((label) => key.toLowerCase().includes(label.toLowerCase())))?.[1] ??
      valueAfterAnyLabel(text, WEIGHT_LABELS);
    const priceTiers = parsePriceTiers(`${raw.priceText} ${text}`).slice(0, 8);
    const unitCost = priceTiers[0]?.price ?? numberFromText(raw.priceText);
    const currency = priceTiers[0]?.currency ?? currencyFromText(raw.priceText || text);
    const moq = extractMoq(text) ?? priceTiers[0]?.minQty ?? null;

    return {
      title: normalizeWhitespace(raw.title) || fallbackTitleFromUrl(url),
      supplierName: valueAfterAnyLabel(text, ["Supplier", "Company Name", "Company", "Seller"]) ?? null,
      supplierUrl: url,
      productUrl: url,
      images: raw.images,
      priceTiers,
      moq,
      unitCost,
      currency,
      specs,
      packageSize,
      packageDimensions: parseDimensionsCm(packageSize),
      unitWeight: parseWeightKg(grossWeight),
      grossWeight: parseWeightKg(grossWeight),
      shippingEstimate: extractShipping(text),
      leadTime: numberFromText(valueAfterAnyLabel(text, ["Lead time", "Delivery time"])),
      supplierRating: numberFromText(valueAfterAnyLabel(text, ["Supplier rating", "Rating"])),
      tradeAssurance: valueAfterAnyLabel(text, ["Trade Assurance"]),
      onTimeDelivery: valueAfterAnyLabel(text, ["On-time delivery", "On time delivery"]),
      rendered: {
        packagingText: [packageSize, grossWeight].filter((item): item is string => Boolean(item)),
        visibleTextSample: text.slice(0, 5000),
      },
    };
  } finally {
    await browser.close();
  }
}

export async function collectSupplierProduct(url: string): Promise<WorkerSupplierResponse> {
  const started = Date.now();
  const warnings: string[] = [];
  const platform = platformFromUrl(url);
  logger.info({ url, platform }, "SUPPLIER_STARTED");

  if (platform === "unknown") {
    return {
      status: "failed",
      source: "own-supplier",
      platform,
      url,
      product: null,
      warnings: ["UNSUPPORTED_SUPPLIER_PLATFORM"],
      debug: { durationMs: Date.now() - started, collector: "playwright-dom" },
    };
  }

  try {
    const product = await withTimeout(collectRenderedSupplier(url), Math.max(config.timeoutMs, 45000));
    if (!product.title) warnings.push("TITLE_MISSING");
    if (!product.unitCost) warnings.push("UNIT_COST_MISSING");
    if (!product.moq) warnings.push("MOQ_MISSING");
    if (!product.packageDimensions) warnings.push("PACKAGE_DIMENSIONS_MISSING");
    if (!product.grossWeight) warnings.push("GROSS_WEIGHT_MISSING");
    const hasCore = Boolean(product.title && (product.unitCost || product.moq || product.packageDimensions || product.grossWeight || product.images.length));
    const status = hasCore && warnings.length ? "partial" : hasCore ? "success" : "failed";
    logger.info({ url, platform, status }, status === "failed" ? "SUPPLIER_FAILED" : "SUPPLIER_SUCCESS");
    return {
      status,
      source: "own-supplier",
      platform,
      url,
      product: hasCore ? product : null,
      warnings,
      debug: { durationMs: Date.now() - started, collector: "playwright-dom" },
    };
  } catch (error) {
    return {
      status: "failed",
      source: "own-supplier",
      platform,
      url,
      product: null,
      warnings: [`SUPPLIER_COLLECTOR_FAILED: ${errorMessage(error)}`],
      debug: { durationMs: Date.now() - started, collector: "playwright-dom" },
    };
  }
}
