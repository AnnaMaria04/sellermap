export interface MarginInput {
  sellingPrice: number;
  costPrice: number;
  wbCommission: number;
  wbLogistics: number;
  packagingCost: number;
  adSpend: number;
  storagePerMonth: number;
  returnRate: number;
  unitsPerMonth: number;
  taxRate: 0.06 | 0.15;
}

export interface SensitivityScenario {
  label: string;
  profitDelta: number;
  marginDelta: number;
  risk: "low" | "medium" | "high";
}

export interface MarginAnalysis extends MarginInput {
  effectiveUnits: number;
  commissionPerUnit: number;
  variableCostPerUnit: number;
  fixedCostPerUnit: number;
  totalCostPerUnit: number;
  grossRevenue: number;
  netRevenue: number;
  tax: number;
  taxPerUnit: number;
  profitPerUnit: number;
  profit: number;
  monthlyProfit: number;
  marginPercent: number;
  breakEvenPrice: number;
  safePriceMin: number;
  safePriceMax: number;
  maxAdSpend: number;
  maxAllowedAdCost: number;
  riskLabel: "опасно" | "слабая" | "рабочая" | "сильная";
  sensitivity: SensitivityScenario[];
}

export interface PackagingInput {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  weightKg: number;
  fragility: "низкая" | "средняя" | "высокая";
}

export interface PackagingAnalysis extends PackagingInput {
  volumeLiters: number;
  packagingCostPerUnit: number;
  wbLogisticsEstimate: number;
  returnCostReserve: number;
  marginImpactPoints: number;
  riskLevel: "low" | "medium" | "high";
}

export interface CardAuditItem {
  type: "title" | "description" | "keywords" | "attributes";
  status: "pending" | "ok" | "warning";
  message: string;
}

export interface AiInsights {
  summary: string;
  risks: string[];
  opportunities: string[];
}

export interface RawResultInput {
  marginInput: MarginInput;
  packagingInput: PackagingInput;
  productName: string;
  category?: string;
  supplierUrl?: string;
  wbQuery?: string;
}

export interface ProductResult {
  margin: MarginAnalysis;
  packaging: PackagingAnalysis;
  audit: CardAuditItem[];
  insights: AiInsights;
  marketMap: {
    competitorCount: number;
    avgPrice: number;
    priceRange: number[];
  };
}
