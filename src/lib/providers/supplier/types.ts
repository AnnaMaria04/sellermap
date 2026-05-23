export type SupplierProduct = {
  supplierUrl: string;
  platform: "alibaba" | "1688" | "aliexpress" | "manual" | "unknown";
  productTitle: string;
  originalTitle?: string | null;
  productImages: string[];
  supplierPriceMin?: number | null;
  supplierPriceMax?: number | null;
  currency?: string | null;
  moq?: number | null;
  variants?: string[];
  specs?: Record<string, string>;
  material?: string | null;
  size?: string | null;
  packageSize?: {
    lengthCm?: number | null;
    widthCm?: number | null;
    heightCm?: number | null;
  } | null;
  grossWeightKg?: number | null;
  shippingPerUnit?: number | null;
  supplierName?: string | null;
  supplierRating?: number | null;
  raw?: unknown;
};

export type SupplierDataProvider = {
  name: "apify-alibaba" | "apify-1688" | "manual" | "generic-ecommerce";
  extractSupplierProduct(url: string): Promise<SupplierProduct>;
};
