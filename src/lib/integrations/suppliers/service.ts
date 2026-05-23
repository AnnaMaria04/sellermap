import type {
  CalculatorDraft,
  SupplierImportedProduct,
  SupplierImportResponse,
  SupplierPlatform,
  SupplierPriceTier,
} from "./types";

const REQUIRED_IMPORT_FIELDS = ["weight", "dimensions", "shippingEstimate"] as const;

type PublicMetadata = {
  title?: string;
  imageUrl?: string;
  supplierName?: string;
  price?: number;
  currency?: "RUB" | "USD" | "CNY";
  productId?: string;
};

export function detectSupplierPlatform(url: string): SupplierPlatform {
  const normalized = url.toLowerCase();
  if (normalized.includes("alibaba.com")) return "alibaba";
  if (normalized.includes("1688.com")) return "1688";
  if (normalized.includes("made-in-china.com")) return "made_in_china";
  return "generic_supplier";
}

export function calculateBestPriceTier(priceTiers: SupplierPriceTier[], selectedQuantity: number) {
  return (
    priceTiers.find((tier) => selectedQuantity >= tier.minQty && (tier.maxQty === null || selectedQuantity <= tier.maxQty)) ??
    priceTiers[0] ??
    null
  );
}

export function detectMissingFields(productData: SupplierImportedProduct) {
  return REQUIRED_IMPORT_FIELDS.filter((field) => productData[field] === null || productData[field] === "");
}

function cleanText(value?: string | null) {
  return value
    ?.replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function matchMeta(html: string, property: string) {
  const escaped = property.replace(":", "[:]");
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return cleanText(match[1]);
  }
  return undefined;
}

function matchTitle(html: string) {
  return cleanText(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]);
}

function parseJsonLdProduct(html: string): PublicMetadata {
  const blocks = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi) ?? [];
  for (const block of blocks) {
    const raw = block.replace(/<script[^>]*>/i, "").replace(/<\/script>/i, "").trim();
    try {
      const parsed = JSON.parse(raw) as unknown;
      const candidates = Array.isArray(parsed) ? parsed : [parsed];
      for (const candidate of candidates) {
        if (!candidate || typeof candidate !== "object") continue;
        const item = candidate as Record<string, unknown>;
        if (item["@type"] !== "Product") continue;
        const offers = item.offers && typeof item.offers === "object" ? (item.offers as Record<string, unknown>) : {};
        const image = Array.isArray(item.image) ? item.image[0] : item.image;
        return {
          title: typeof item.name === "string" ? cleanText(item.name) : undefined,
          imageUrl: typeof image === "string" ? image : undefined,
          price: typeof offers.price === "string" || typeof offers.price === "number" ? Number(offers.price) : undefined,
          currency:
            offers.priceCurrency === "USD" || offers.priceCurrency === "CNY" || offers.priceCurrency === "RUB"
              ? offers.priceCurrency
              : undefined,
        };
      }
    } catch {
      // Ignore malformed public metadata.
    }
  }
  return {};
}

function productIdFromUrl(url: string) {
  return (
    url.match(/product-detail\/[^/]*?[_-](\d+)\.html/i)?.[1] ??
    url.match(/offer\/(\d+)\.html/i)?.[1] ??
    url.match(/[?&](?:productId|offerId|id)=(\d+)/i)?.[1]
  );
}

function titleFromUrlSlug(url: string) {
  try {
    const pathname = new URL(url).pathname;
    const slug =
      pathname.match(/product-detail\/([^/]+?)(?:[_-]\d+)?\.html/i)?.[1] ??
      pathname.match(/offer\/\d+\/?([^/]*)/i)?.[1];
    if (!slug) return undefined;
    return cleanText(
      slug
        .replace(/[_-]+/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase()),
    );
  } catch {
    return undefined;
  }
}

async function fetchPublicSupplierMetadata(url: string): Promise<PublicMetadata> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; SellerMapBot/0.1; +https://sellermap.vercel.app)",
        accept: "text/html,application/xhtml+xml",
      },
      cache: "no-store",
    });
    if (!response.ok) return { productId: productIdFromUrl(url), title: titleFromUrlSlug(url) };
    const html = await response.text();
    const jsonLd = parseJsonLdProduct(html);
    const title =
      jsonLd.title ??
      matchMeta(html, "og:title") ??
      matchMeta(html, "twitter:title") ??
      matchTitle(html);
    const imageUrl =
      jsonLd.imageUrl ??
      matchMeta(html, "og:image") ??
      matchMeta(html, "twitter:image");
    const supplierName =
      matchMeta(html, "og:site_name") ??
      cleanText(html.match(/"companyName"\s*:\s*"([^"]+)"/i)?.[1]);

    return {
      ...jsonLd,
      imageUrl,
      supplierName,
      productId: productIdFromUrl(url),
      title: title || titleFromUrlSlug(url),
    };
  } catch {
    return { productId: productIdFromUrl(url), title: titleFromUrlSlug(url) };
  } finally {
    clearTimeout(timeout);
  }
}

function applyPublicMetadata(product: SupplierImportedProduct, metadata: PublicMetadata) {
  return {
    ...product,
    title: metadata.title || product.title,
    supplierName: metadata.supplierName || product.supplierName,
    productImages: metadata.imageUrl ? [metadata.imageUrl] : product.productImages,
    priceTiers:
      metadata.price && metadata.currency
        ? [{ minQty: product.moq ?? 1, maxQty: null, price: metadata.price, currency: metadata.currency }]
        : product.priceTiers,
    unitCost: metadata.price ?? product.unitCost,
    currency: metadata.currency ?? product.currency,
    specifications: {
      ...product.specifications,
      ...(metadata.productId ? { supplierProductId: metadata.productId } : {}),
    },
  };
}

export function normalizeSupplierData(
  productData: SupplierImportedProduct,
  metadata: PublicMetadata = {},
): SupplierImportResponse {
  const selectedTier = calculateBestPriceTier(productData.priceTiers, productData.selectedQuantity);
  const product = {
    ...productData,
    unitCost: selectedTier?.price ?? productData.unitCost,
    currency: selectedTier?.currency ?? productData.currency,
  };
  const missingFields = detectMissingFields(product);
  const partial = missingFields.length > 0;
  const hasRealTitle = Boolean(metadata.title);
  const hasRealImage = Boolean(metadata.imageUrl);
  const hasRealPrice = Boolean(metadata.price);

  return {
    source: detectSupplierPlatform(product.supplierUrl),
    status: partial ? "partial" : "success",
    confidence: Number(
      Math.min(
        0.9,
        (partial ? 0.52 : 0.72) + (hasRealTitle ? 0.12 : 0) + (hasRealImage ? 0.08 : 0) + (hasRealPrice ? 0.12 : 0),
      ).toFixed(2),
    ),
    product,
    fieldSources: {
      title: hasRealTitle ? "supplier_link" : "mock",
      supplierName: metadata.supplierName ? "supplier_link" : "mock",
      productImages: hasRealImage ? "supplier_link" : "mock",
      moq: product.moq ? "mock" : "missing",
      unitCost: hasRealPrice ? "supplier_link" : product.unitCost ? "mock" : "missing",
      weight: product.weight ? "mock" : "missing",
      dimensions: product.dimensions ? "mock" : "missing",
      shippingEstimate: product.shippingEstimate ? "mock" : "missing",
    },
    missingFields,
  };
}

export function extractAlibabaProduct(url: string): SupplierImportedProduct {
  return {
    title: "Дорожный органайзер для косметики, складной",
    supplierName: "Yiwu Travel Goods Co.",
    supplierUrl: url,
    productImages: [
      "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=900&q=80",
    ],
    priceTiers: [
      { minQty: 100, maxQty: 499, price: 2.4, currency: "USD" },
      { minQty: 500, maxQty: 999, price: 2.1, currency: "USD" },
      { minQty: 1000, maxQty: null, price: 1.85, currency: "USD" },
    ],
    moq: 100,
    selectedQuantity: 500,
    unitCost: 2.1,
    currency: "USD",
    variants: ["черный", "бежевый", "розовый"],
    specifications: {
      material: "Oxford fabric",
      package: "individual polybag",
    },
    weight: null,
    dimensions: null,
    shippingEstimate: null,
    leadTime: 18,
  };
}

export function extract1688Product(url: string): SupplierImportedProduct {
  return {
    ...extractAlibabaProduct(url),
    supplierName: "1688 фабрика, Иу",
    priceTiers: [
      { minQty: 50, maxQty: 299, price: 15.8, currency: "CNY" },
      { minQty: 300, maxQty: 999, price: 13.9, currency: "CNY" },
      { minQty: 1000, maxQty: null, price: 12.6, currency: "CNY" },
    ],
    moq: 50,
    selectedQuantity: 300,
    currency: "CNY",
    unitCost: 13.9,
  };
}

export function extractGenericSupplierProduct(url: string): SupplierImportedProduct {
  return {
    ...extractAlibabaProduct(url),
    title: "Товар поставщика",
    supplierName: "Поставщик",
    productImages: [],
    priceTiers: [],
    moq: null,
    selectedQuantity: 100,
    unitCost: null,
    currency: "USD",
    leadTime: null,
  };
}

export async function importSupplierProduct(url: string): Promise<SupplierImportResponse> {
  const source = detectSupplierPlatform(url);
  if (!/^https?:\/\//i.test(url)) {
    return {
      source,
      status: "failed",
      confidence: 0,
      product: extractGenericSupplierProduct(url),
      fieldSources: {},
      missingFields: ["supplierUrl"],
      error: "Укажите корректную ссылку поставщика.",
    };
  }

  const baseData =
    source === "alibaba"
      ? extractAlibabaProduct(url)
      : source === "1688"
        ? extract1688Product(url)
        : extractGenericSupplierProduct(url);
  const metadata = await fetchPublicSupplierMetadata(url);
  const rawData = applyPublicMetadata(baseData, metadata);

  return normalizeSupplierData(rawData, metadata);
}

export function mapSupplierDataToCalculator(productData: SupplierImportedProduct): CalculatorDraft {
  return {
    productCost: productData.unitCost,
    plannedSellingPrice: null,
    commissionRate: 15,
    logisticsEstimate: productData.shippingEstimate,
    packagingCost: null,
    supplierDeliveryCost: productData.shippingEstimate,
    weight: productData.weight,
    dimensions: productData.dimensions,
    selectedQuantity: productData.selectedQuantity,
    currency: productData.currency,
  };
}
