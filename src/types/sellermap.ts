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

export type SupplierCurrency = "RUB" | "USD" | "CNY" | "EUR";

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
  productCost?: number;
  productCostRub: number;
  currency: SupplierCurrency;
  packagingCost: number;
  supplierDeliveryCost: number;
  commissionPercent: number;
  logisticsCost?: number;
  wbLogisticsCost: number;
  storageCost: number;
  returnReservePercent: number;
  taxPercent: number;
  adBudgetPercent: number;
};

export type EconomicsResult = {
  landedCostRub: number;
  totalCosts: number;
  profitPerUnit: number;
  marginPercent: number;
  breakEvenPrice: number;
  minimumSafePrice: number;
  maxAdBudgetRub: number;
  maxSupplierCostRub: number;
  safePriceMin: number;
  safePriceMax: number;
  costBreakdown: {
    productCost?: number;
    productCostRub: number;
    commission: number;
    logistics?: number;
    wbLogisticsCost: number;
    storage: number;
    packaging: number;
    packagingCost: number;
    supplierDelivery: number;
    supplierDeliveryCost: number;
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

export type MarketTarget = {
  mode: "wb_link" | "keyword" | "category" | "manual" | "skip";
  wbUrl?: string;
  wbNmId?: number;
  keyword?: string;
  category?: string;
  source: "user" | "generated" | "manual";
};

export type MarketDataProviderName = "mpstats" | "wb_public" | "manual" | "demo" | "none";

export type CompetitorProduct = {
  nmId?: number | null;
  title: string;
  brand?: string | null;
  sellerName?: string | null;
  price: number | null;
  rating?: number | null;
  reviewCount?: number | null;
  estimatedSales?: number | null;
  estimatedRevenue?: number | null;
  image?: string | null;
  url?: string | null;
  source: MarketDataProviderName;
};

export type MarketStats = {
  averagePrice: number | null;
  medianPrice: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  averageReviews: number | null;
  reviewBarrier: number | null;
  competitorCount: number | null;
  topSellerShare: number | null;
  marketDifficulty: "low" | "medium" | "high" | "unknown";
};

export type MarketAnalysisResult = {
  provider: MarketDataProviderName;
  status: "success" | "not_configured" | "failed";
  competitors: CompetitorProduct[];
  marketStats: MarketStats | null;
  warnings: string[];
};

export type CommissionMatch = {
  categoryName: string;
  subjectName?: string;
  commissionPercent: number;
  source: "wb_api" | "manual" | "fallback";
  confidence: number;
};

export type PriceScenario = {
  price: number;
  profitPerUnit: number;
  marginPercent: number;
  status: "loss" | "risky" | "healthy" | "strong" | "above_market";
  note: string;
};

export type DataConfidenceResult = {
  score: number;
  level: "low" | "medium" | "high";
  missingCriticalFields: string[];
  confidenceDrivers: string[];
  confidenceWarnings: string[];
};

export type LaunchDecision = "buy" | "test_only" | "wait_more_data" | "do_not_buy";

export type DecisionScores = {
  overall: number;
  profit: number;
  market: number;
  competition: number;
  risk: number;
  launchReadiness: number;
  dataConfidence: number;
};

export type ActionItem = {
  priority: "high" | "medium" | "low";
  title: string;
  reason: string;
  action: string;
  source: "rule_based" | "yandex_gpt";
  completed?: boolean;
};

export type DecisionResult = {
  decision: LaunchDecision;
  label: string;
  overallScore: number;
  scores: DecisionScores;
  topReasons: string[];
  blockers: string[];
  nextActions: ActionItem[];
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
  sourceUrl: string | null;
  sourcePlatform: SupplierPlatform | null;
  sourceProvider: string | null;
  importStatus: SupplierImportStatus | null;
  importConfidence: number | null;
  confidence?: number;
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
    storageCost: number | null;
    taxPercent: number | null;
    adBudgetPercent: number | null;
    returnReservePercent: number | null;
  };
  marketTarget: MarketTarget | null;
  fieldSources: Record<string, FieldSource>;
  missingFields: string[];
  warnings: string[];
  commission: CommissionMatch | null;
  economics: EconomicsResult | null;
  priceScenarios: PriceScenario[];
  dataConfidence: DataConfidenceResult | null;
  decision: DecisionResult | null;
  actionPlan: ActionItem[];
  wbConnection: WbConnectionStatus | null;
  market: MarketAnalysisResult | null;
  recommendations: Recommendation[];
};
