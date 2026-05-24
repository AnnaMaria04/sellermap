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
  source: "own-wb";
  raw?: unknown;
};

export type WBProductDetail = WBProduct & {
  description?: string | null;
  specs?: Record<string, string> | null;
  images?: string[];
};

export type WorkerSearchResponse = {
  status: "success" | "partial" | "failed";
  source: "own-wb";
  query: string;
  items: WBProduct[];
  warnings: string[];
  debug?: {
    durationMs: number;
    collector: string;
    resultCount: number;
  };
};

export type WorkerProductResponse = {
  status: "success" | "partial" | "failed";
  source: "own-wb";
  nmId: string;
  product: WBProductDetail | null;
  warnings: string[];
  debug?: {
    durationMs: number;
    collector: string;
  };
};

export type CollectorConfig = {
  port: number;
  apiKey: string | null;
  nodeEnv: string;
  maxConcurrency: number;
  delayMs: number;
  timeoutMs: number;
  maxResults: number;
  userAgent: string;
  proxyUrl: string | null;
};
