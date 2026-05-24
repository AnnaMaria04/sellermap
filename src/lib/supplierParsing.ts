import type { Dimensions } from "@/types/sellermap";

export function inferSupplierTitleFromUrl(url: string) {
  let pathname = "";
  try {
    pathname = new URL(url).pathname;
  } catch {
    return null;
  }
  const slug =
    pathname.match(/product-detail\/([^/]+?)(?:[_-]\d+)?\.html/i)?.[1] ??
    pathname.match(/item\/([^/]+?)(?:[_-]\d+)?\.html/i)?.[1] ??
    null;
  if (!slug) return null;
  return slug.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

export function parseSupplierDimensionText(value: unknown): Dimensions | null {
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

export function parseSupplierWeightKg(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const parsed = Number(value.replace(/\s/g, "").split(/[-–—]/)[0].replace(/[^\d.,]/g, "").replace(",", "."));
  if (!Number.isFinite(parsed)) return null;
  const raw = value.toLowerCase();
  return raw.includes("g") && !raw.includes("kg") ? Number((parsed / 1000).toFixed(3)) : parsed;
}
