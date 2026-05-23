import "server-only";

import { extractWithApify } from "@/services/apifyClient";
import { extractWithHtmlMeta, extractFromPastedHtml } from "@/services/htmlSupplierExtractor";
import type {
  CalculatorDraft,
  Dimensions,
  FieldSource,
  NormalizedSupplierProduct,
  PriceTier,
  RawSupplierProduct,
  SupplierCurrency,
  SupplierImportResponse,
  SupplierPlatform,
} from "@/types/sellermap";

const WEAK_TOKENS = new Set([
  "high",
  "quality",
  "new",
  "hot",
  "sale",
  "factory",
  "custom",
  "wholesale",
  "product",
  "detail",
  "supplier",
  "manufacturer",
]);

const REQUIRED_IMPORT_FIELDS: Array<keyof NormalizedSupplierProduct> = ["weight", "dimensions", "shippingEstimate"];

export function detectSupplierPlatform(url: string): SupplierPlatform {
  const normalized = url.toLowerCase();
  if (normalized.includes("alibaba.com")) return "alibaba";
  if (normalized.includes("1688.com")) return "1688";
  if (normalized.includes("aliexpress.com")) return "aliexpress";
  if (normalized.includes("made-in-china.com")) return "made_in_china";
  return "generic_supplier";
}

function tokenize(value: string | null | undefined) {
  if (!value) return [];
  return value
    .split(/[^a-zA-Z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

export function parseProductIdentityFromUrl(url: string) {
  let pathname = "";
  try {
    pathname = new URL(url).pathname;
  } catch {
    return { productId: null, slug: null, tokens: [] };
  }

  const productId =
    pathname.match(/product-detail\/[^/]*?[_-](\d+)\.html/i)?.[1] ??
    pathname.match(/offer\/(\d+)/i)?.[1] ??
    pathname.match(/item\/(\d+)/i)?.[1] ??
    null;
  const slug =
    pathname.match(/product-detail\/([^/]+?)(?:[_-]\d+)?\.html/i)?.[1] ??
    pathname.match(/item\/([^/]+?)(?:[_-]\d+)?\.html/i)?.[1] ??
    null;
  const tokens = tokenize(slug).filter((token) => !WEAK_TOKENS.has(token.toLowerCase()));

  return { productId, slug, tokens };
}

function titleFromSlug(slug: string | null) {
  if (!slug) return null;
  return slug
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function pickFirst(raw: RawSupplierProduct, possibleKeys: string[]) {
  for (const key of possibleKeys) {
    const value = raw[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.replace(/\s/g, "");
    const rangeFirstValue = normalized.split(/[-–—]/)[0];
    const parsed = Number(rangeFirstValue.replace(/[^\d.,]/g, "").replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function amountFrom(value: unknown): number | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const item = value as Record<string, unknown>;
    return asNumber(pickFirst(item, ["amount", "value", "min", "price", "salePrice", "current", "low", "cost", "fee"]));
  }
  return asNumber(value);
}

function objectFrom(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function deepEntries(value: unknown, prefix = "", depth = 0): Array<[string, unknown]> {
  const object = objectFrom(value);
  if (!object || depth > 4) return [];
  return Object.entries(object).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    const childObject = objectFrom(child);
    return childObject ? [[path, child] as [string, unknown], ...deepEntries(child, path, depth + 1)] : [[path, child] as [string, unknown]];
  });
}

function pickDeepByKey(raw: RawSupplierProduct, patterns: RegExp[]) {
  const entry = deepEntries(raw).find(([path, value]) => {
    if (value === null || value === undefined || value === "") return false;
    return patterns.some((pattern) => pattern.test(path.toLowerCase()));
  });
  return entry?.[1] ?? null;
}

function dimensionValueFromObject(source: Record<string, unknown>) {
  const preferred = [
    "package size",
    "package dimensions",
    "package dimension",
    "packing size",
    "packing dimensions",
    "packing dimension",
    "packaging size",
    "packaging dimensions",
    "carton size",
    "carton dimensions",
    "carton dimension",
    "box size",
    "box dimensions",
    "box dimension",
    "carton size",
  ];
  for (const pattern of preferred) {
    const entry = Object.entries(source).find(([key]) => {
      const normalized = key.toLowerCase();
      if (normalized.includes("nib size") || normalized.includes("brush size")) return false;
      return normalized.includes(pattern);
    });
    if (entry) return entry[1];
  }
  return null;
}

function dimensionsFromObject(value: unknown): Dimensions | null {
  const object = objectFrom(value);
  if (!object) return null;
  const length = asNumber(pickFirst(object, ["length", "l", "long", "packageLength", "cartonLength"]));
  const width = asNumber(pickFirst(object, ["width", "w", "packageWidth", "cartonWidth"]));
  const height = asNumber(pickFirst(object, ["height", "h", "packageHeight", "cartonHeight"]));
  if (!length || !width || !height) return null;
  const unitRaw = String(pickFirst(object, ["unit", "dimensionUnit", "sizeUnit"]) ?? "cm").toLowerCase();
  const factor = unitRaw.includes("mm") ? 0.1 : unitRaw === "m" || unitRaw.includes("meter") ? 100 : 1;
  return {
    length: Number((length * factor).toFixed(1)),
    width: Number((width * factor).toFixed(1)),
    height: Number((height * factor).toFixed(1)),
    unit: "cm",
  };
}

function parseDimensionText(value: unknown): Dimensions | null {
  if (typeof value !== "string") return null;
  const raw = value.toLowerCase().replace(/,/g, ".");
  const unit = raw.includes("mm") ? "mm" : raw.includes("m") && !raw.includes("cm") ? "m" : "cm";
  const numbers = raw.match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  if (numbers.length < 2) return null;
  const factor = unit === "mm" ? 0.1 : unit === "m" ? 100 : 1;
  const [length, width, height] = numbers.map((number) => Number((number * factor).toFixed(1)));
  return {
    length,
    width,
    height: height ?? width,
    unit: "cm",
  };
}

function asCurrency(value: unknown): SupplierCurrency {
  if (value === "CNY" || value === "USD" || value === "RUB" || value === "EUR") return value;
  const raw = String(value ?? "").toUpperCase();
  if (raw.includes("CNY") || raw.includes("RMB") || raw.includes("¥")) return "CNY";
  if (raw.includes("RUB") || raw.includes("₽")) return "RUB";
  if (raw.includes("EUR") || raw.includes("€")) return "EUR";
  return "USD";
}

export function normalizeImages(raw: RawSupplierProduct): string[] {
  const value = pickFirst(raw, ["images", "imageUrls", "productImages", "photos", "gallery", "image", "mainImages"]);
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          const record = item as Record<string, unknown>;
          return String(record.url ?? record.src ?? record.image ?? record.imageUrl ?? record.thumbnail ?? "");
        }
        return "";
      })
      .filter((item) => item.startsWith("http"));
  }
  if (typeof value === "string" && value.startsWith("http")) return [value];
  return [];
}

function quantityRange(value: unknown) {
  if (typeof value === "number") return { minQty: value, maxQty: null };
  if (typeof value !== "string") return { minQty: 1, maxQty: null };
  const numbers = value.match(/\d+/g)?.map(Number) ?? [];
  if (numbers.length >= 2) return { minQty: numbers[0], maxQty: numbers[1] };
  if (numbers.length === 1) return { minQty: numbers[0], maxQty: null };
  return { minQty: 1, maxQty: null };
}

export function normalizePriceTiers(raw: RawSupplierProduct): PriceTier[] {
  const value = pickFirst(raw, ["priceTiers", "moqPrices", "prices", "priceRanges", "priceRange", "ladderPrices", "quantityPrices"]);
  if (Array.isArray(value)) {
    return value
      .map((tier) => {
        const item = tier as Record<string, unknown>;
        const usdPrice = pickFirst(item, ["pricePerUnitUSD", "usdPrice", "priceUSD"]);
        const priceValue = usdPrice ?? pickFirst(item, ["price", "unitPrice", "pricePerUnit", "value", "amount", "salePrice"]);
        const qtyValue = pickFirst(item, ["minQty", "quantityMin", "quantity", "minOrder", "from", "range", "qty", "pieces"]);
        const price = amountFrom(priceValue);
        const { minQty, maxQty } = quantityRange(qtyValue);
        if (!price) return null;
        return {
          minQty,
          maxQty: asNumber(pickFirst(item, ["maxQty", "quantityMax", "to"])) ?? maxQty,
          price,
          currency: usdPrice ? "USD" : asCurrency(pickFirst(item, ["currency", "priceCurrency"]) ?? priceValue),
        };
      })
      .filter((tier): tier is PriceTier => Boolean(tier));
  }

  const price = amountFrom(pickFirst(raw, ["price", "minPrice", "unitPrice", "salePrice", "originalPrice"]));
  return price
    ? [
        {
          minQty: normalizeMOQ(raw) ?? 1,
          maxQty: null,
          price,
          currency: asCurrency(pickFirst(raw, ["currency", "priceCurrency"])),
        },
      ]
    : [];
}

export function normalizeMOQ(raw: RawSupplierProduct): number | null {
  const quantityPrices = raw.quantityPrices;
  if (Array.isArray(quantityPrices) && quantityPrices[0]) {
    const firstTier = quantityPrices[0] as Record<string, unknown>;
    const tierMoq = asNumber(pickFirst(firstTier, ["quantityMin", "minQty", "minOrder", "quantity"]));
    if (tierMoq) return tierMoq;
  }

  return asNumber(
    pickFirst(raw, [
      "moq",
      "minOrder",
      "minimumOrderQuantity",
      "minOrderQuantity",
      "minOrderQty",
      "customsMoq",
      "boxMoq",
      "minimumOrder",
      "minOrderText",
      "quantityMin",
    ]),
  );
}

export function normalizeSpecifications(raw: RawSupplierProduct): Record<string, unknown> {
  const value = pickFirst(raw, ["specs", "specifications", "attributes", "productAttributes", "productSpecifications"]);
  if (Array.isArray(value)) {
    return Object.fromEntries(
      value
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const record = item as Record<string, unknown>;
          const key = String(record.name ?? record.key ?? record.attributeName ?? record.title ?? "").trim();
          const val = record.value ?? record.attributeValue ?? record.text;
          return key ? [key, val] : null;
        })
        .filter((item): item is [string, unknown] => Boolean(item)),
    );
  }
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

export function normalizeDimensions(raw: RawSupplierProduct): Dimensions | null {
  const value =
    pickFirst(raw, [
      "packageDimensions",
      "packageDimension",
      "packageSize",
      "packingSize",
      "packingDimensions",
      "cartonSize",
      "cartonDimensions",
      "boxSize",
      "boxDimensions",
      "dimensions",
      "size",
    ]) ??
    pickDeepByKey(raw, [
      /package.*dimension/,
      /package.*size/,
      /packing.*dimension/,
      /packing.*size/,
      /carton.*dimension/,
      /carton.*size/,
      /box.*dimension/,
      /box.*size/,
      /shipping.*dimension/,
    ]);
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const parsed = dimensionsFromObject(value);
    if (parsed) return parsed;
  }
  if (typeof value === "string") {
    const parsed = parseDimensionText(value);
    if (parsed) return parsed;
  }

  const specs = normalizeSpecifications(raw);
  const sizeValue =
    dimensionValueFromObject(specs) ??
    dimensionValueFromObject(
      {
        ...(raw.otherProperties && typeof raw.otherProperties === "object" ? raw.otherProperties as Record<string, unknown> : {}),
        ...(raw.industryProperties && typeof raw.industryProperties === "object" ? raw.industryProperties as Record<string, unknown> : {}),
      },
    );
  const parsedFromSpecs = parseDimensionText(sizeValue);
  if (parsedFromSpecs) return parsedFromSpecs;

  return null;
}

export function normalizeWeight(raw: RawSupplierProduct): number | null {
  const direct =
    pickFirst(raw, [
      "unitWeight",
      "packageWeight",
      "package_weight",
      "shippingWeight",
      "grossWeight",
      "gross_weight",
      "weight",
      "productWeight",
    ]) ??
    pickDeepByKey(raw, [
      /unit.*weight/,
      /package.*weight/,
      /shipping.*weight/,
      /gross.*weight/,
      /logistics.*weight/,
      /weight$/,
    ]);
  return asNumber(direct);
}

function normalizeShippingEstimate(raw: RawSupplierProduct): number | null {
  const value =
    pickFirst(raw, [
      "shippingEstimate",
      "shippingCost",
      "shippingPrice",
      "deliveryCost",
      "deliveryPrice",
      "freightCost",
      "freight",
    ]) ??
    pickDeepByKey(raw, [
      /shipping.*(estimate|cost|price|fee|amount)/,
      /delivery.*(estimate|cost|price|fee|amount)/,
      /freight.*(estimate|cost|price|fee|amount)/,
      /logistics.*(estimate|cost|price|fee|amount)/,
    ]);
  return amountFrom(value);
}

export function calculateBestPriceTier(priceTiers: PriceTier[], selectedQuantity?: number | null) {
  const quantity = selectedQuantity ?? priceTiers[0]?.minQty ?? null;
  const tier =
    quantity === null
      ? null
      : priceTiers.find((item) => quantity >= item.minQty && (item.maxQty === null || quantity <= item.maxQty)) ??
        priceTiers[0] ??
        null;
  return { selectedQuantity: quantity, unitCost: tier?.price ?? null, tier };
}

export function normalizeSupplierData(raw: RawSupplierProduct, source: SupplierPlatform, provider: string): NormalizedSupplierProduct {
  const priceTiers = normalizePriceTiers(raw);
  const selected = calculateBestPriceTier(priceTiers, normalizeMOQ(raw));
  const title = pickFirst(raw, ["title", "name", "productName", "product_title", "productTitle", "subject"]);
  const supplierValue = pickFirst(raw, ["supplier", "supplierName", "companyName", "sellerName", "manufacturer", "vendorName"]);
  const supplierName =
    typeof supplierValue === "string"
      ? supplierValue
      : supplierValue && typeof supplierValue === "object"
        ? pickFirst(supplierValue as RawSupplierProduct, ["name", "companyName", "supplierName"])
        : null;
  return {
    title: typeof title === "string" ? title : null,
    supplierName: typeof supplierName === "string" ? supplierName : null,
    supplierUrl: typeof raw.supplierUrl === "string" ? raw.supplierUrl : "",
    productUrl: typeof raw.productUrl === "string" ? raw.productUrl : "",
    productImages: normalizeImages(raw),
    priceTiers,
    moq: normalizeMOQ(raw),
    selectedQuantity: selected.selectedQuantity,
    unitCost: selected.unitCost,
    currency: selected.tier?.currency ?? asCurrency(pickFirst(raw, ["currency", "priceCurrency"])),
    variants: Array.isArray(raw.variants) ? raw.variants.filter((item): item is string => typeof item === "string") : [],
    specifications: {
      ...normalizeSpecifications(raw),
      supplierRating: pickFirst(raw, ["supplierRating", "rating", "supplierScore"]),
      tradeAssurance: pickFirst(raw, ["tradeAssurance", "tradeAssuranceAmount"]),
      onTimeDelivery: pickFirst(raw, ["onTimeDelivery", "onTimeDeliveryRate", "deliveryHours"]),
      ordersCount: pickFirst(raw, ["ordersCount", "orderCount"]),
      soldCount: pickFirst(raw, ["saledCount", "soldCount"]),
      repurchaseRate: pickFirst(raw, ["repurchaseRate"]),
      source,
      provider,
    },
    weight: normalizeWeight(raw),
    dimensions: normalizeDimensions(raw),
    shippingEstimate: normalizeShippingEstimate(raw),
    leadTime: asNumber(pickFirst(raw, ["leadTime", "leadTimeDays", "deliveryTime", "deliveryHours"])),
    imageAltTexts: Array.isArray(raw.imageAltTexts) ? raw.imageAltTexts.filter((item): item is string => typeof item === "string") : [],
    category: typeof raw.category === "string" ? raw.category : null,
  };
}

export function detectMissingFields(product: NormalizedSupplierProduct): string[] {
  return REQUIRED_IMPORT_FIELDS.filter((field) => {
    const value = product[field];
    if (field === "dimensions") {
      return !product.dimensions?.length || !product.dimensions.width || !product.dimensions.height;
    }
    return value === null || value === "";
  });
}

export function validateProductIdentity(input: {
  urlTokens: string[];
  urlProductId?: string | null;
  extractedProductId?: string | null;
  extractedUrl?: string | null;
  productTitle?: string | null;
  supplierName?: string | null;
  imageAltTexts?: string[];
  category?: string | null;
}) {
  const extractedIdentity = [input.extractedProductId, input.extractedUrl].filter(Boolean).join(" ");
  const productIdMatched = Boolean(input.urlProductId && extractedIdentity.includes(input.urlProductId));
  const haystack = [input.productTitle, input.supplierName, input.category, ...(input.imageAltTexts ?? [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const matchedTokens = input.urlTokens.filter((token) => haystack.includes(token.toLowerCase()) || extractedIdentity.includes(token));
  const strongMatches = matchedTokens.filter((token) => token.length >= 3 && /[A-Z0-9]/.test(token));
  const ok = productIdMatched || strongMatches.length >= 1 || matchedTokens.length >= 2 || input.urlTokens.length === 0;
  return {
    ok,
    confidence: ok ? Math.min(0.92, (productIdMatched ? 0.76 : 0.45) + matchedTokens.length * 0.14 + strongMatches.length * 0.18) : 0.12,
    matchedTokens,
    reason: ok ? undefined : "Не найдено совпадений между URL и извлечёнными данными.",
  };
}

function extractedProductId(raw: RawSupplierProduct): string | null {
  const value = pickFirst(raw, ["productId", "id", "itemId", "offerId", "product_id", "item_id"]);
  return value === null ? null : String(value);
}

function validateRawProductIdentity(url: string, raw: RawSupplierProduct) {
  const identity = parseProductIdentityFromUrl(url);
  const product = normalizeSupplierData({ ...raw, supplierUrl: url, productUrl: url }, detectSupplierPlatform(url), "apify");
  return validateProductIdentity({
    urlTokens: identity.tokens,
    urlProductId: identity.productId,
    extractedProductId: extractedProductId(raw),
    extractedUrl: typeof raw.url === "string" ? raw.url : typeof raw.productUrl === "string" ? raw.productUrl : null,
    productTitle: product.title,
    supplierName: product.supplierName,
    imageAltTexts: product.imageAltTexts,
    category: product.category,
  });
}

export function mapSupplierDataToCalculator(product: NormalizedSupplierProduct): CalculatorDraft {
  return {
    productCost: product.unitCost,
    plannedSellingPrice: null,
    commissionPercent: null,
    logisticsCost: product.shippingEstimate,
    packagingCost: null,
    supplierDeliveryCost: product.shippingEstimate,
    weight: product.weight,
    dimensions: product.dimensions,
    selectedQuantity: product.selectedQuantity,
    currency: product.currency,
    exchangeRateToRub: product.currency === "RUB" ? 1 : null,
  };
}

export function buildSafeImportFailure(reason: string, providerErrors: unknown[] = []): SupplierImportResponse {
  return {
    source: "generic_supplier",
    provider: "none",
    status: "failed",
    confidence: 0,
    product: null,
    fieldSources: {},
    missingFields: [],
    warnings: [],
    error: reason,
    rawDebug: { urlTokens: [], matchedTokens: [], providerErrors: providerErrors.map(String) },
  };
}

function sourceMap(product: NormalizedSupplierProduct, source: FieldSource): Record<string, FieldSource> {
  return {
    title: product.title ? source : "missing",
    supplierName: product.supplierName ? source : "missing",
    productImages: product.productImages.length > 0 ? source : "missing",
    moq: product.moq ? source : "missing",
    unitCost: product.unitCost ? source : "missing",
    weight: product.weight ? source : "missing",
    dimensions: product.dimensions ? source : "missing",
    shippingEstimate: product.shippingEstimate ? source : "missing",
  };
}

async function responseFromRaw(url: string, raw: RawSupplierProduct, source: SupplierPlatform, provider: "apify" | "html_meta", providerErrors: string[]): Promise<SupplierImportResponse> {
  const identity = parseProductIdentityFromUrl(url);
  const product = normalizeSupplierData({ ...raw, supplierUrl: url, productUrl: url }, source, provider);
  const validation = validateProductIdentity({
    urlTokens: identity.tokens,
    urlProductId: identity.productId,
    extractedProductId: extractedProductId(raw),
    extractedUrl: typeof raw.url === "string" ? raw.url : typeof raw.productUrl === "string" ? raw.productUrl : null,
    productTitle: product.title,
    supplierName: product.supplierName,
    imageAltTexts: product.imageAltTexts,
    category: product.category,
  });

  if (!validation.ok) {
    return {
      source,
      provider,
      status: "identity_mismatch",
      confidence: validation.confidence,
      product: null,
      fieldSources: {},
      missingFields: [],
      warnings: ["Найденные данные не похожи на товар из ссылки. Мы не применили эти данные."],
      error: validation.reason,
      rawDebug: { urlTokens: identity.tokens, matchedTokens: validation.matchedTokens, providerErrors },
    };
  }

  const missingFields = detectMissingFields(product);
  const specs = product.specifications;
  const productSizeOnly =
    !product.dimensions &&
    Object.entries(specs).some(([key, value]) => {
      const normalized = key.toLowerCase();
      return (
        /(^|[^a-z])(pen|nib|brush|product)\s*size/.test(normalized) &&
        typeof value === "string" &&
        /\d/.test(value)
      );
    });
  return {
    source,
    provider,
    status: missingFields.length > 0 ? "partial" : "success",
    confidence: Number(Math.min(0.95, validation.confidence + (provider === "apify" ? 0.16 : 0.04)).toFixed(2)),
    product,
    fieldSources: sourceMap(product, provider === "apify" ? "apify" : "supplier_import"),
    missingFields,
    warnings: [
      ...(missingFields.length ? ["Часть полей не найдена автоматически и требует ручного заполнения."] : []),
      ...(productSizeOnly
        ? ["Apify нашёл размер самого товара, но не размер упаковки. Для логистики WB нужны габариты упаковки/короба."]
        : []),
      ...(product.currency !== "RUB" ? ["Цена поставщика в USD/CNY. Для финального расчёта нужен курс валюты."] : []),
    ],
    rawDebug: { urlTokens: identity.tokens, matchedTokens: validation.matchedTokens, providerErrors },
  };
}

function buildUrlIdentityDraft(
  url: string,
  source: SupplierPlatform,
  providerErrors: string[],
  reason: string,
): SupplierImportResponse {
  const identity = parseProductIdentityFromUrl(url);
  const title = titleFromSlug(identity.slug);

  if (!title) {
    return {
      source,
      provider: "html_meta",
      status: "blocked",
      confidence: 0,
      product: null,
      fieldSources: {},
      missingFields: [],
      warnings: ["Автоматический импорт не смог прочитать страницу поставщика."],
      error: reason,
      rawDebug: { urlTokens: identity.tokens, matchedTokens: [], providerErrors },
    };
  }

  return {
    source,
    provider: "html_meta",
    status: "partial",
    confidence: 0.42,
    product: {
      title,
      supplierName: null,
      supplierUrl: url,
      productUrl: url,
      productImages: [],
      priceTiers: [],
      moq: null,
      selectedQuantity: null,
      unitCost: null,
      currency: "USD",
      variants: [],
      specifications: {
        supplierProductId: identity.productId,
        source: "url_identity_only",
      },
      weight: null,
      dimensions: null,
      shippingEstimate: null,
      leadTime: null,
      imageAltTexts: [],
      category: null,
    },
    fieldSources: {
      title: "supplier_import",
      supplierName: "missing",
      productImages: "missing",
      moq: "missing",
      unitCost: "missing",
      weight: "missing",
      dimensions: "missing",
      shippingEstimate: "missing",
    },
    missingFields: ["unitCost", "moq", "weight", "dimensions", "shippingEstimate"],
    warnings: [
      "Создан безопасный черновик только из URL товара. Цена, MOQ, изображения, вес и доставка требуют ручного подтверждения.",
      reason,
    ],
    rawDebug: { urlTokens: identity.tokens, matchedTokens: identity.tokens, providerErrors },
  };
}

export async function importWithProviderChain(url: string): Promise<SupplierImportResponse> {
  const source = detectSupplierPlatform(url);
  const providerErrors: string[] = [];
  const apify = await extractWithApify(url, source, {
    acceptRaw: (raw) => {
      const validation = validateRawProductIdentity(url, raw);
      return validation.ok ? true : { ok: false, reason: validation.reason };
    },
  });
  if (apify.ok) return responseFromRaw(url, apify.raw, source, "apify", providerErrors);
  providerErrors.push(apify.error);

  const html = await extractWithHtmlMeta(url);
  if (html) {
    const htmlResponse = await responseFromRaw(url, html, source, "html_meta", providerErrors);
    if (htmlResponse.status !== "identity_mismatch") return htmlResponse;
    return buildUrlIdentityDraft(
      url,
      source,
      providerErrors,
      "HTML/meta данные страницы не совпали с URL, поэтому применён только безопасный черновик из самой ссылки.",
    );
  }

  if (apify.status === "not_configured") {
    return buildUrlIdentityDraft(url, source, providerErrors, "Apify не настроен или недоступен. Проверьте APIFY_API_TOKEN в Vercel.");
  }

  return {
    source,
    provider: "apify",
    status: "blocked",
    confidence: 0,
    product: null,
    fieldSources: {},
    missingFields: [],
    warnings: ["Автоматический импорт не смог прочитать страницу поставщика."],
    error: "Страница поставщика заблокировала импорт или не вернула данные.",
    rawDebug: { urlTokens: parseProductIdentityFromUrl(url).tokens, matchedTokens: [], providerErrors },
  };
}

export async function importSupplierProduct(input: {
  url: string;
  preferredProvider?: "auto" | "apify" | "html_meta";
}): Promise<SupplierImportResponse> {
  if (!/^https?:\/\//i.test(input.url)) {
    return buildSafeImportFailure("Укажите корректную ссылку поставщика.");
  }
  if (input.preferredProvider === "html_meta") {
    const html = await extractWithHtmlMeta(input.url);
    if (!html) return buildSafeImportFailure("HTML/meta импорт не вернул данные.");
    return responseFromRaw(input.url, html, detectSupplierPlatform(input.url), "html_meta", []);
  }
  return importWithProviderChain(input.url);
}

export async function importSupplierFromHtml(originalUrl: string, html: string) {
  const raw = extractFromPastedHtml(originalUrl, html);
  if (!raw) return buildSafeImportFailure("В HTML не найдены данные товара.");
  return responseFromRaw(originalUrl, raw, detectSupplierPlatform(originalUrl), "html_meta", []);
}
