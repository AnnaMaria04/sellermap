import type { WBProduct } from "../types.js";

export function normalizePriceRub(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value);
  }
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/\s/g, "").replace(/[^\d,.-]/g, "").replace(",", ".");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

function normalizeWbApiPriceRub(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value / 100);
  return normalizePriceRub(value);
}

export function normalizeReviewCount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  if (typeof value !== "string") return null;
  const parsed = Number(value.replace(/\s/g, "").replace(/[^\d]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeRating(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value * 10) / 10;
  if (typeof value !== "string") return null;
  const parsed = Number(value.replace(",", ".").replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) ? Math.round(parsed * 10) / 10 : null;
}

export function extractNmIdFromUrl(url: string): string | null {
  return url.match(/wildberries\.ru\/catalog\/(\d+)/i)?.[1] ?? url.match(/\/catalog\/(\d+)/i)?.[1] ?? null;
}

export function buildWBProductUrl(nmId: string) {
  return `https://www.wildberries.ru/catalog/${nmId}/detail.aspx`;
}

export function cleanTitle(title: unknown) {
  return String(title ?? "").replace(/\s+/g, " ").trim();
}

function pick(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return null;
}

export function getWbImageUrl(nmId: string) {
  const id = Number(nmId);
  if (!Number.isFinite(id)) return null;
  return `https://basket-${String(Math.floor(id / 100000000)).padStart(2, "0")}.wbbasket.ru/vol${Math.floor(id / 100000)}/part${Math.floor(id / 1000)}/${id}/images/big/1.webp`;
}

export function normalizeSearchItem(raw: unknown, query: string, position: number): WBProduct | null {
  const row = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const sizes = Array.isArray(row.sizes) ? row.sizes : [];
  const firstSize = sizes[0] && typeof sizes[0] === "object" ? (sizes[0] as Record<string, unknown>) : {};
  const sizePrice = firstSize.price && typeof firstSize.price === "object" ? (firstSize.price as Record<string, unknown>) : {};
  const id = pick(row, ["nmId", "nm_id", "id", "productId", "article"]);
  const nmId = id ? String(id) : typeof row.url === "string" ? extractNmIdFromUrl(row.url) : null;
  const title = cleanTitle(pick(row, ["title", "name", "productName"]));
  if (!nmId && !title) return null;
  const directImage = pick(row, ["imageUrl", "image", "img", "thumbnail", "photo"]);
  const price =
    normalizePriceRub(pick(row, ["priceRub", "price", "salePrice", "currentPrice", "discountPrice"])) ??
    normalizeWbApiPriceRub(pick(row, ["salePriceU"])) ??
    normalizeWbApiPriceRub(pick(sizePrice, ["product", "basic", "total"]));
  return {
    nmId: nmId ?? `${query}-${position}`,
    title: title || "Товар WB",
    brand: typeof pick(row, ["brand", "brandName"]) === "string" ? String(pick(row, ["brand", "brandName"])) : null,
    sellerName: typeof pick(row, ["sellerName", "supplier", "supplierName"]) === "string" ? String(pick(row, ["sellerName", "supplier", "supplierName"])) : null,
    sellerId: pick(row, ["sellerId", "supplierId"]) ? String(pick(row, ["sellerId", "supplierId"])) : null,
    priceRub: price,
    originalPriceRub:
      normalizePriceRub(pick(row, ["originalPriceRub", "basicPrice", "oldPrice"])) ??
      normalizeWbApiPriceRub(pick(row, ["priceU"])) ??
      normalizeWbApiPriceRub(pick(sizePrice, ["basic"])),
    rating: normalizeRating(pick(row, ["rating", "reviewRating", "review_rating", "stars"])),
    reviewCount: normalizeReviewCount(pick(row, ["reviewCount", "reviews", "feedbacks", "comments"])),
    imageUrl: typeof directImage === "string" ? directImage : nmId ? getWbImageUrl(nmId) : null,
    productUrl: typeof row.url === "string" ? row.url : nmId ? buildWBProductUrl(nmId) : null,
    category: pick(row, ["category", "categoryName", "kindId"]) ? String(pick(row, ["category", "categoryName", "kindId"])) : null,
    subject: pick(row, ["subject", "subjectName"]) ? String(pick(row, ["subject", "subjectName"])) : null,
    searchKeyword: query,
    searchPosition: position,
    stockSignal: normalizeReviewCount(pick(row, ["stock", "totalQuantity", "total_quantity", "quantity"])),
    source: "own-wb",
    raw,
  };
}
