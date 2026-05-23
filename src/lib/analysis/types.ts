export type RiskLevel = "low" | "medium" | "high";
export type SourceStatus = "подключено" | "демо" | "ожидает API ключ" | "ручной ввод";
export type ScoreStatus = "сильный" | "средний" | "риск" | "слабое место";

export type DataSourceStatus = {
  source: string;
  status: SourceStatus;
  lastUpdated: string;
  confidence: number;
  note: string;
};

export type ScoreBreakdownItem = {
  key: string;
  label: string;
  score: number;
  status: ScoreStatus;
  note: string;
};

export type Competitor = {
  name: string;
  nmId: string;
  imageUrl?: string;
  price: number;
  rating: number;
  reviews: number;
  position: number;
  estimatedMonthlySales: number;
  estimatedRevenue: number;
  strength: string;
  weakness: string;
  positioning: string;
  aiInsight: string;
  x: number;
  y: number;
  bubbleSize: number;
  riskLevel: RiskLevel;
};

export type MarginSensitivity = {
  label: string;
  profitDelta: number;
  marginDelta: number;
  risk: RiskLevel;
};

export type MarginInput = {
  sellingPrice: number;
  costPrice: number;
  wbCommission: number;    // decimal, e.g. 0.19
  wbLogistics: number;     // ₽/unit
  packagingCost: number;   // ₽/unit
  adSpend: number;         // ₽/month
  storagePerMonth: number; // ₽/month
  returnRate: number;      // decimal, e.g. 0.09
  unitsPerMonth: number;
  taxRate: number;         // 0.06 (USN income) or 0.15 (USN income-expenses)
};

export type MarginAnalysis = MarginInput & {
  // intermediate
  effectiveUnits: number;
  commissionPerUnit: number;
  variableCostPerUnit: number;
  fixedCostPerUnit: number;
  totalCostPerUnit: number;
  grossRevenue: number;
  netRevenue: number;
  tax: number;
  taxPerUnit: number;
  // outputs
  profitPerUnit: number;
  profit: number;           // = profitPerUnit (backward compat)
  monthlyProfit: number;
  marginPercent: number;    // = netMargin % (backward compat)
  breakEvenPrice: number;
  safePriceMin: number;
  safePriceMax: number;
  maxAdSpend: number;
  maxAllowedAdCost: number; // = maxAdSpend (backward compat)
  riskLabel: "опасно" | "слабая" | "рабочая" | "сильная";
  sensitivity: MarginSensitivity[];
};

export type PackagingInput = {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  weightKg: number;
  fragility: "низкая" | "средняя" | "высокая";
  category: string;
  fulfillmentModel: "FBO" | "FBS";
  packageType: string;
  quantityPerShipment: number;
  supplierCountry: string;
  shippingMode: "air" | "truck" | "rail" | "sea" | "manual";
  currency: "RUB" | "CNY" | "USD";
};

export type PackagingAnalysis = PackagingInput & {
  packagingCostPerUnit: number;
  wbLogisticsEstimate: number;
  returnCostReserve: number;
  storageRisk: RiskLevel;
  deliveryCoefficient: number;
  riskLevel: RiskLevel;
  marginImpactPoints: number;
  note: string;
};

export type CardAuditItem = {
  label: string;
  score: number;
  status: ScoreStatus;
  explanation: string;
  action: string;
};

export type AiInsights = {
  good: string[];
  blockers: string[];
  beforePurchase: string[];
  firstTest: string[];
};

export type SupplierInput = {
  supplierUrl: string;
  supplierPrice: number;
  moq: number;
  shippingPrice: number;
  unitWeightKg: number;
  cartonSize: string;
  leadTimeDays: number;
  currency: "RUB" | "CNY" | "USD";
  supplierNotes: string;
};

export type RawResultInput = {
  nmId: string;
  title: string;
  category: string;
  categoryId: string;
  summary: string;
  updatedAt: string;
  marginInput: MarginInput;
  packagingInput: PackagingInput;
  dataSources: DataSourceStatus[];
  competitors: Competitor[];
  cardAuditSeed: Omit<CardAuditItem, "status">[];
  supplier: SupplierInput;
};

export type ProductResult = {
  nmId: string;
  title: string;
  category: string;
  score: number;
  verdict: string;
  verdictChip: string;
  summary: string;
  updatedAt: string;
  dataSources: DataSourceStatus[];
  scoreBreakdown: ScoreBreakdownItem[];
  competitors: Competitor[];
  marketMap: {
    xLabel: string;
    yLabel: string;
    legend: Array<{ label: string; riskLevel: RiskLevel | "user"; className: string }>;
  };
  margin: MarginAnalysis;
  packaging: PackagingAnalysis;
  cardAudit: CardAuditItem[];
  aiInsights: AiInsights;
  checklist: string[];
  supplier: SupplierInput & {
    domain: string;
    requiresManualConfirmation: boolean;
  };
};
