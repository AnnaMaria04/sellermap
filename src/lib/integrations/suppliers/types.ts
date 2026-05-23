export type SupplierPlatform = "alibaba" | "1688" | "made_in_china" | "generic_supplier";
export type SupplierImportStatus = "success" | "partial" | "failed";
export type SupplierFieldSource = "supplier_link" | "manual" | "missing" | "mock";
export type SupplierCurrency = "RUB" | "USD" | "CNY";

export type SupplierPriceTier = {
  minQty: number;
  maxQty: number | null;
  price: number;
  currency: SupplierCurrency;
};

export type SupplierImportedProduct = {
  title: string;
  supplierName: string;
  supplierUrl: string;
  productImages: string[];
  priceTiers: SupplierPriceTier[];
  moq: number | null;
  selectedQuantity: number;
  unitCost: number | null;
  currency: SupplierCurrency;
  variants: string[];
  specifications: Record<string, string>;
  weight: number | null;
  dimensions: string | null;
  shippingEstimate: number | null;
  leadTime: number | null;
};

export type SupplierImportResponse = {
  source: SupplierPlatform;
  status: SupplierImportStatus;
  confidence: number;
  product: SupplierImportedProduct;
  fieldSources: Record<string, SupplierFieldSource>;
  missingFields: string[];
  error?: string;
};

export type CalculatorDraft = {
  productCost: number | null;
  plannedSellingPrice: number | null;
  commissionRate: number | null;
  logisticsEstimate: number | null;
  packagingCost: number | null;
  supplierDeliveryCost: number | null;
  weight: number | null;
  dimensions: string | null;
  selectedQuantity: number;
  currency: SupplierCurrency;
};

export type ProductAnalysisResult = {
  product: {
    title: string;
    supplierName: string;
    supplierUrl: string;
    images: string[];
    moq: number | null;
    unitCost: number | null;
    selectedQuantity: number;
    plannedSellingPrice: number | null;
    category: string;
    weight: number | null;
    dimensions: string | null;
  };
  fieldSources: Record<string, SupplierFieldSource>;
  economics: {
    profitPerUnit: number;
    marginPercent: number;
    breakEvenPrice: number;
    safePriceMin: number;
    safePriceMax: number;
    costBreakdown: Record<string, number>;
  } | null;
  wbConnection: {
    content: boolean;
    analytics: boolean;
    prices: boolean;
    common: boolean;
  };
  missingFields: string[];
  recommendations: string[];
};
