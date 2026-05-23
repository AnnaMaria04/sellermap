import type { MarketDataProviderName } from "@/types/sellermap";

export type WBProduct = {
  nmId: string;
  title: string;
  brand?: string | null;
  sellerName?: string | null;
  sellerId?: string | null;
  priceRub: number | null;
  originalPriceRub?: number | null;
  rating?: number | null;
  reviewCount?: number | null;
  imageUrl?: string | null;
  productUrl?: string | null;
  category?: string | null;
  subject?: string | null;
  searchKeyword: string;
  searchPosition?: number | null;
  stockSignal?: number | null;
  estimatedMonthlySales?: number | null;
  estimatedMonthlyRevenue?: number | null;
  source: Exclude<MarketDataProviderName, "manual" | "demo" | "none" | "wb_public"> | "direct-wb";
  raw?: unknown;
};

export type WBProductDetail = WBProduct & {
  description?: string | null;
  specs?: Record<string, unknown> | null;
};

export type ProviderHealth = {
  name: MarketDataProviderName;
  available: boolean;
  status: "ready" | "not_configured" | "disabled" | "failed";
  message?: string;
};

export type MarketDataProvider = {
  name: "cache" | "apify" | "mpstats" | "direct-wb";
  searchSimilarProducts(
    query: string,
    options?: {
      limit?: number;
      region?: string;
      useCache?: boolean;
    },
  ): Promise<WBProduct[]>;
  getProductDetails?(nmId: string): Promise<WBProductDetail | null>;
  getProviderHealth?(): Promise<ProviderHealth>;
};
