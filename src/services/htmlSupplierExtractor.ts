import type { RawSupplierProduct } from "@/types/sellermap";

function cleanText(value?: string | null) {
  return value
    ?.replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function meta(html: string, property: string) {
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["'][^>]*>`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return cleanText(match[1]);
  }
  return null;
}

export function extractMetaTags(html: string): Partial<RawSupplierProduct> {
  return {
    title: meta(html, "og:title") ?? meta(html, "twitter:title") ?? cleanText(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]),
    images: [meta(html, "og:image") ?? meta(html, "twitter:image")].filter(Boolean),
    description: meta(html, "description") ?? meta(html, "og:description"),
    supplierName: meta(html, "og:site_name"),
  };
}

export function extractJsonLdProduct(html: string): Partial<RawSupplierProduct> {
  const blocks = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi) ?? [];
  for (const block of blocks) {
    try {
      const raw = block.replace(/<script[^>]*>/i, "").replace(/<\/script>/i, "").trim();
      const parsed = JSON.parse(raw) as unknown;
      const candidates = Array.isArray(parsed) ? parsed : [parsed];
      for (const candidate of candidates) {
        if (!candidate || typeof candidate !== "object") continue;
        const item = candidate as Record<string, unknown>;
        if (item["@type"] !== "Product") continue;
        const offers = item.offers && typeof item.offers === "object" ? (item.offers as Record<string, unknown>) : {};
        return {
          title: item.name,
          images: Array.isArray(item.image) ? item.image : item.image ? [item.image] : [],
          price: offers.price,
          currency: offers.priceCurrency,
          supplierName: item.brand,
          specifications: item.additionalProperty,
        };
      }
    } catch {
      // Ignore malformed page JSON.
    }
  }
  return {};
}

export function extractEmbeddedProductData(html: string): Partial<RawSupplierProduct> {
  const companyName = cleanText(html.match(/"companyName"\s*:\s*"([^"]+)"/i)?.[1]);
  const productName = cleanText(html.match(/"productName"\s*:\s*"([^"]+)"/i)?.[1]);
  const title = cleanText(html.match(/"title"\s*:\s*"([^"]{8,180})"/i)?.[1]);
  return {
    title: productName ?? title,
    supplierName: companyName,
  };
}

export async function extractWithHtmlMeta(url: string): Promise<RawSupplierProduct | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; SellerMapBot/0.1; +https://sellermap.vercel.app)",
        accept: "text/html,application/xhtml+xml",
      },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const html = await response.text();
    return {
      ...extractMetaTags(html),
      ...extractJsonLdProduct(html),
      ...extractEmbeddedProductData(html),
      productUrl: url,
      supplierUrl: url,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export function extractFromPastedHtml(originalUrl: string, html: string): RawSupplierProduct | null {
  const extracted: RawSupplierProduct = {
    ...extractMetaTags(html),
    ...extractJsonLdProduct(html),
    ...extractEmbeddedProductData(html),
    productUrl: originalUrl,
    supplierUrl: originalUrl,
  };
  return extracted.title || (Array.isArray(extracted.images) && extracted.images.length > 0) ? extracted : null;
}
