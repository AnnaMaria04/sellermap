export type SupplierPlatform =
  | "alibaba"
  | "1688"
  | "aliexpress"
  | "made_in_china"
  | "generic_supplier";

export type SupplierImportStatus =
  | "success"
  | "partial"
  | "blocked"
  | "failed"
  | "identity_mismatch"
  | "not_configured"
  | "manual_review_required";

export type FieldSource =
  | "apify"
  | "supplier_import"
  | "manual"
  | "wb_api"
  | "mpstats"
  | "yandex_gpt"
  | "rule_based"
  | "missing"
  | "demo";

export type SupplierCurrency = "RUB" | "USD" | "CNY";

export type PriceTier = {
  minQty: number;
  maxQty: number | null;
  price: number;
  currency: SupplierCurrency;
};

export type Dimensions = {
  length: number | null;
  width: number | null;
  height: number | null;
  unit: "cm";
};

export type NormalizedSupplierProduct = {
  title: string | null;
  supplierName: string | null;
  supplierUrl: string;
  productUrl: string;
  productImages: string[];
  priceTiers: PriceTier[];
  moq: number | null;
  selectedQuantity: number | null;
  unitCost: number | null;
  currency: SupplierCurrency;
  variants: string[];
  specifications: Record<string, unknown>;
  weight: number | null;
  dimensions: Dimensions | null;
  shippingEstimate: number | null;
  leadTime: number | null;
  imageAltTexts?: string[];
  category?: string | null;
};

export type RawSupplierProduct = Record<string, unknown>;

export type SupplierImportResponse = {
  source: SupplierPlatform;
  provider: "apify" | "html_meta" | "manual" | "demo" | "none";
  status: SupplierImportStatus;
  confidence: number;
  product: NormalizedSupplierProduct | null;
  fieldSources: Record<string, FieldSource>;
  missingFields: string[];
  warnings: string[];
  error?: string;
  rawDebug: {
    urlTokens: string[];
    matchedTokens: string[];
    providerErrors: string[];
  };
};

export type CalculatorDraft = {
  productCost: number | null;
  plannedSellingPrice: number | null;
  commissionPercent: number | null;
  logisticsCost: number | null;
  packagingCost: number | null;
  supplierDeliveryCost: number | null;
  weight: number | null;
  dimensions: Dimensions | null;
  selectedQuantity: number | null;
  currency: SupplierCurrency;
  exchangeRateToRub: number | null;
};

export type EconomicsInput = {
  sellingPrice: number;
  productCost: number;
  currency: SupplierCurrency;
  packagingCost: number;
  supplierDeliveryCost: number;
  commissionPercent: number;
  logisticsCost: number;
  storageCost: number;
  returnReservePercent: number;
  taxPercent: number;
  adBudgetPercent: number;
};

export type EconomicsResult = {
  profitPerUnit: number;
  marginPercent: number;
  breakEvenPrice: number;
  safePriceMin: number;
  safePriceMax: number;
  costBreakdown: {
    productCost: number;
    commission: number;
    logistics: number;
    storage: number;
    packaging: number;
    supplierDelivery: number;
    tax: number;
    adBudget: number;
    returnReserve: number;
  };
  warnings: string[];
};

export type WbConnectionStatus = {
  content: boolean;
  analytics: boolean;
  prices: boolean;
  common: boolean;
  statistics: boolean;
  advert: boolean;
  errors: Record<string, string>;
};

export type MarketAnalysisResult = {
  provider: "mpstats" | "moneyplace" | "mayak" | "demo" | "none";
  status: "success" | "not_configured" | "failed";
  competitors: unknown[];
  marketStats: {
    averagePrice: number | null;
    medianPrice: number | null;
    minPrice: number | null;
    maxPrice: number | null;
    topSellerShare: number | null;
    averageReviews: number | null;
    reviewBarrier: number | null;
  };
  warnings: string[];
};

export type Recommendation = {
  priority: "high" | "medium" | "low";
  title: string;
  reason: string;
  action: string;
  expectedImpact: string;
};

export type ProductAnalysisDraft = {
  id: string;
  createdAt: string;
  sourceUrl: string;
  sourcePlatform: SupplierPlatform;
  sourceProvider: string;
  importStatus: SupplierImportStatus;
  confidence: number;
  product: {
    title: string | null;
    supplierName: string | null;
    supplierUrl: string | null;
    productUrl: string | null;
    images: string[];
    moq: number | null;
    priceTiers: PriceTier[];
    selectedQuantity: number | null;
    unitCost: number | null;
    currency: string;
    exchangeRateToRub: number | null;
    productCostRub: number | null;
    plannedSellingPrice: number | null;
    category: string | null;
    weight: number | null;
    dimensions: Dimensions | null;
    packagingCost: number | null;
    supplierDeliveryCost: number | null;
    logisticsCost: number | null;
    commissionPercent: number | null;
  };
  fieldSources: Record<string, FieldSource>;
  missingFields: string[];
  warnings: string[];
  economics: EconomicsResult | null;
  wbConnection: WbConnectionStatus | null;
  market: MarketAnalysisResult | null;
  recommendations: Recommendation[];
};
