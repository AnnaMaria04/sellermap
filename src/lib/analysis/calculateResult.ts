import { calcWBLogistics } from "@/lib/wbLogistics";
import type {
  AiInsights,
  CardAuditItem,
  MarginAnalysis,
  MarginInput,
  PackagingAnalysis,
  PackagingInput,
  ProductResult,
  RawResultInput,
  SensitivityScenario,
} from "./types";

export function calculateResult(input: RawResultInput): ProductResult {
  const margin = calculateMargin(input.marginInput);
  const packaging = calculatePackagingRisk(input.packagingInput);
  const audit = calculateCardAudit(input);
  const insights = generateAiInsights(margin, packaging, input);
  const marketMap = {
    competitorCount: 42,
    avgPrice: 3200,
    priceRange: [1500, 5200],
  };
  return {
    margin,
    packaging,
    audit,
    insights,
    marketMap,
  };
}

function marginRiskLabel(marginPercent: number): MarginAnalysis["riskLabel"] {
  if (marginPercent < 10) return "опасно";
  if (marginPercent < 20) return "слабая";
  if (marginPercent < 35) return "рабочая";
  return "сильная";
}

export function calculateMargin(input: MarginInput): MarginAnalysis {
  const {
    sellingPrice, costPrice, wbCommission, wbLogistics, packagingCost,
    adSpend, storagePerMonth, returnRate, unitsPerMonth, taxRate,
  } = input;

  // Step 1: effective units after returns
  const effectiveUnits = unitsPerMonth * (1 - returnRate);

  // Step 2: revenue
  const grossRevenue = sellingPrice * unitsPerMonth;
  const netRevenue = sellingPrice * effectiveUnits;

  // Step 3: variable costs per unit
  const commissionPerUnit = sellingPrice * wbCommission;
  const variableCostPerUnit = costPrice + wbLogistics + packagingCost + commissionPerUnit;

  // Step 4: fixed costs allocated per effective unit
  const fixedCostPerUnit = effectiveUnits > 0 ? (adSpend + storagePerMonth) / effectiveUnits : 0;

  // Step 5: total cost per unit
  const totalCostPerUnit = variableCostPerUnit + fixedCostPerUnit;

  // Step 6: tax — УСН 6% on gross revenue, УСН 15% on taxable base after deductions
  let tax: number;
  if (taxRate === 0.06) {
    tax = grossRevenue * 0.06;
  } else {
    const allowedDeductions =
      (costPrice + wbLogistics + packagingCost) * effectiveUnits + adSpend + storagePerMonth;
    const taxableBase = Math.max(0, netRevenue - allowedDeductions);
    tax = taxableBase * 0.15;
  }
  const taxPerUnit = effectiveUnits > 0 ? tax / effectiveUnits : 0;

  // Step 7: profit
  const profitPerUnit = sellingPrice - totalCostPerUnit - taxPerUnit;
  const monthlyProfit = profitPerUnit * effectiveUnits;
  const netMargin = netRevenue > 0 ? (monthlyProfit / netRevenue) * 100 : 0;

  // Step 8: break-even price — guard against zero/negative denominator
  // For УСН 6%: P*(1 - wbCommission - 0.06) = variableCosts + fixedCostPerUnit
  const breakEvenDenominator = 1 - wbCommission - (taxRate === 0.06 ? 0.06 : 0);

  let breakEvenPrice: number;
  let safePriceMin: number;
  let safePriceMax: number;

  if (breakEvenDenominator <= 0) {
    breakEvenPrice = Infinity;
    safePriceMin = Infinity;
    safePriceMax = Infinity;
  } else {
    breakEvenPrice = Math.ceil(
      (costPrice + wbLogistics + packagingCost + fixedCostPerUnit) / breakEvenDenominator,
    );
    safePriceMin = Math.ceil(breakEvenPrice / (1 - 0.15));
    safePriceMax = Math.ceil(breakEvenPrice / (1 - 0.25));
  }

  // Step 9: max monthly ad budget that still preserves 15% net margin
  const maxAdSpend = Math.max(
    0,
    Math.floor((profitPerUnit - sellingPrice * 0.15) * effectiveUnits),
  );

  return {
    ...input,
    effectiveUnits,
    commissionPerUnit,
    variableCostPerUnit,
    fixedCostPerUnit,
    totalCostPerUnit,
    grossRevenue,
    netRevenue,
    tax,
    taxPerUnit,
    profitPerUnit,
    profit: profitPerUnit,
    monthlyProfit,
    marginPercent: netMargin,
    breakEvenPrice,
    safePriceMin,
    safePriceMax,
    maxAdSpend,
    maxAllowedAdCost: maxAdSpend,
    riskLabel: marginRiskLabel(netMargin),
    sensitivity: [
      {
        label: "Реклама +5%",
        profitDelta: -Math.round(sellingPrice * 0.05),
        marginDelta: -5,
        risk: netMargin - 5 < 20 ? "high" : "medium",
      },
      {
        label: "Упаковка +50 ₽",
        profitDelta: -50,
        marginDelta: -((50 / sellingPrice) * 100),
        risk: "medium",
      },
      {
        label: "Цена -10%",
        profitDelta: -Math.round(sellingPrice * 0.1),
        marginDelta: -10,
        risk: "high",
      },
      {
        label: "Возвраты выше",
        profitDelta: -Math.round(wbLogistics * 0.5),
        marginDelta: -((wbLogistics * 0.5 / sellingPrice) * 100),
        risk: "medium",
      },
    ],
  };
}

export function validateMarginResult(result: MarginAnalysis): string[] {
  const warnings: string[] = [];
  if (result.marginPercent > 60) warnings.push("Маржа >60% — проверь входные данные");
  if (result.marginPercent < -50) warnings.push("Маржа <-50% — проверь себестоимость");
  if (isFinite(result.breakEvenPrice) && result.breakEvenPrice > result.sellingPrice * 2)
    warnings.push("Точка безубыточности выше цены в 2x — проверь комиссию");
  if (result.profitPerUnit > result.sellingPrice * 0.5)
    warnings.push("Прибыль/шт >50% цены — необычно высокая");
  if (result.tax < 0) warnings.push("Налог отрицательный — ошибка в расчёте базы");
  return warnings;
}

export function calculatePackagingRisk(input: PackagingInput): PackagingAnalysis {
  const volumeLiters = (input.lengthCm * input.widthCm * input.heightCm) / 1000;
  const fragilityMultiplier =
    input.fragility === "низкая"
      ? 0.95
      : input.fragility === "высокая"
        ? 1.15
        : 1.05;
  const packagingCostPerUnit = Math.round((55 + volumeLiters * 2.6) * fragilityMultiplier);
  const wbLogisticsEstimate = calcWBLogistics(input.lengthCm, input.widthCm, input.heightCm, input.weightKg);
  const returnCostReserve = Math.round(wbLogisticsEstimate * 0.46);
  const marginImpactPoints = Number(((packagingCostPerUnit + wbLogisticsEstimate) / 2950 * 100).toFixed(1));
  const riskLevel = marginImpactPoints > 15 || input.fragility === "высокая" ? "high" : marginImpactPoints > 9 ? "medium" : "low";
  return {
    ...input,
    volumeLiters,
    packagingCostPerUnit,
    wbLogisticsEstimate,
    returnCostReserve,
    marginImpactPoints,
    riskLevel,
  };
}

function calculateCardAudit(input: RawResultInput): CardAuditItem[] {
  return [
    { type: "title", status: "pending", message: "Заголовок: оптимизирован ли для поиска?" },
    { type: "description", status: "pending", message: "Описание: достаточно ли подробно?" },
    { type: "keywords", status: "pending", message: "Ключевые слова: релевантны ли?" },
    { type: "attributes", status: "pending", message: "Характеристики: все ли заполнены?" },
  ];
}

function generateAiInsights(
  margin: MarginAnalysis,
  packaging: PackagingAnalysis,
  input: RawResultInput,
): AiInsights {
  return {
    summary: "Товар готов к тестированию",
    risks: [],
    opportunities: [],
  };
}
