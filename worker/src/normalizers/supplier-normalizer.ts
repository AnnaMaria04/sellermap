import type { SupplierPriceTier } from "../types.js";

export function normalizeWhitespace(value: string | null | undefined) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

export function numberFromText(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const match = value.replace(/\s/g, "").match(/-?\d+(?:[,.]\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0].replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

export function currencyFromText(value: unknown): SupplierPriceTier["currency"] {
  const text = String(value ?? "").toUpperCase();
  if (text.includes("EUR") || text.includes("€")) return "EUR";
  if (text.includes("CNY") || text.includes("RMB") || text.includes("¥")) return "CNY";
  if (text.includes("RUB") || text.includes("₽")) return "RUB";
  return "USD";
}

export function parseDimensionsCm(value: unknown) {
  if (typeof value !== "string") return null;
  const text = value.toLowerCase().replace(/,/g, ".");
  const match = text.match(/(\d+(?:\.\d+)?)\s*[xх*×]\s*(\d+(?:\.\d+)?)(?:\s*[xх*×]\s*(\d+(?:\.\d+)?))?\s*(mm|cm|m)?/i);
  if (!match) return null;
  const unit = match[4] ?? "cm";
  const factor = unit === "mm" ? 0.1 : unit === "m" ? 100 : 1;
  const nums = [match[1], match[2], match[3] ?? "1"].map((item) => Number(item) * factor);
  if (nums.some((item) => !Number.isFinite(item))) return null;
  return {
    length: Number(nums[0].toFixed(1)),
    width: Number(nums[1].toFixed(1)),
    height: Number(nums[2].toFixed(1)),
    unit: "cm" as const,
  };
}

export function parseWeightKg(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const parsed = numberFromText(value);
  if (parsed === null) return null;
  const text = value.toLowerCase();
  if (text.includes("g") && !text.includes("kg")) return Number((parsed / 1000).toFixed(3));
  return parsed;
}

export function parsePriceTiers(text: string): SupplierPriceTier[] {
  const normalized = normalizeWhitespace(text);
  const tierMatches = [...normalized.matchAll(/(?:€|\$|¥|USD|EUR|CNY|RMB)?\s*(\d+(?:[,.]\d+)?)\s*(?:\/\s*(?:piece|pcs|unit))?.{0,28}?(\d+)\s*[-–—]\s*(\d+|\+)?\s*(?:pieces|pcs|units)?/gi)];
  return tierMatches
    .map((match) => {
      const price = numberFromText(match[1]);
      const minQty = numberFromText(match[2]);
      if (price === null || minQty === null) return null;
      return {
        minQty,
        maxQty: match[3] && match[3] !== "+" ? numberFromText(match[3]) : null,
        price,
        currency: currencyFromText(match[0]),
      };
    })
    .filter((item): item is SupplierPriceTier => Boolean(item));
}

export function valueAfterAnyLabel(text: string, labels: string[]) {
  const normalized = normalizeWhitespace(text);
  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`${escaped}\\s*[:：]?\\s*([^\\n\\r|]{1,80})`, "i");
    const match = normalized.match(pattern);
    if (match?.[1]) return normalizeWhitespace(match[1]);
  }
  return null;
}
