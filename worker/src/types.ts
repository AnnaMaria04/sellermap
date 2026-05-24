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

export type SupplierPriceTier = {
  minQty: number;
  maxQty: number | null;
  price: number;
  currency: "USD" | "EUR" | "CNY" | "RUB";
};

export type SupplierRawProduct = {
  title: string | null;
  supplierName: string | null;
  supplierUrl: string;
  productUrl: string;
  images: string[];
  priceTiers: SupplierPriceTier[];
  moq: number | null;
  unitCost: number | null;
  currency: "USD" | "EUR" | "CNY" | "RUB";
  specs: Record<string, string>;
  packageSize: string | null;
  packageDimensions: {
    length: number | null;
    width: number | null;
    height: number | null;
    unit: "cm";
  } | null;
  unitWeight: number | null;
  grossWeight: number | null;
  shippingEstimate: number | null;
  leadTime: number | null;
  supplierRating: number | null;
  tradeAssurance: string | null;
  onTimeDelivery: string | null;
  rendered: {
    packagingText: string[];
    visibleTextSample: string;
  };
};

export type WorkerSupplierResponse = {
  status: "success" | "partial" | "failed";
  source: "own-supplier";
  platform: "alibaba" | "1688" | "aliexpress" | "unknown";
  url: string;
  product: SupplierRawProduct | null;
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
