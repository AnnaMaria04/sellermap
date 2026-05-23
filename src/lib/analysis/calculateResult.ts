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
  ScoreBreakdownItem,
  ScoreStatus,
} from "./types";

function scoreStatus(score: number): ScoreStatus {
  if (score >= 78) return "сильный";
  if (score >= 58) return "средний";
  if (score >= 42) return "риск";
  return "слабое место";
}

function marginRiskLabel(marginPercent: number): MarginAnalysis["riskLabel"] {
  if (marginPercent < 10) return "опасно";
  if (marginPercent < 20) return "слабая";
  if (marginPercent < 30) return "рабочая";
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
    input.fragility === "высокая" ? 1.45 : input.fragility === "средняя" ? 1.18 : 1;
  const shippingMultiplier =
    input.shippingMode === "air"
      ? 1.35
      : input.shippingMode === "sea"
        ? 0.82
        : input.shippingMode === "rail"
          ? 0.95
          : 1.05;
  const packagingCostPerUnit = Math.round((55 + volumeLiters * 2.6) * fragilityMultiplier);
  const wbLogisticsEstimate = calcWBLogistics(input.lengthCm, input.widthCm, input.heightCm, input.weightKg);
  const returnCostReserve = Math.round(wbLogisticsEstimate * 0.46);
  const marginImpactPoints = Number(((packagingCostPerUnit + wbLogisticsEstimate) / 2950 * 100).toFixed(1));
  const riskLevel = marginImpactPoints > 15 || input.fragility === "высокая" ? "high" : marginImpactPoints > 9 ? "medium" : "low";

  return {
    ...input,
    packagingCostPerUnit,
    wbLogisticsEstimate,
    returnCostReserve,
    storageRisk: volumeLiters > 7 ? "medium" : "low",
    deliveryCoefficient: Number(shippingMultiplier.toFixed(2)),
    riskLevel,
    marginImpactPoints,
    note: "Требуется сверить упаковку с актуальными правилами WB перед закупкой партии.",
  };
}

export function calculateSafePriceRange(margin: MarginAnalysis) {
  return {
    min: margin.safePriceMin,
    max: margin.safePriceMax,
  };
}

export function calculateVerdict(margin: MarginAnalysis, packaging: PackagingAnalysis) {
  if (margin.marginPercent < 18 || packaging.riskLevel === "high") {
    return {
      verdict: "Перспективно, но маржа требует проверки",
      chip: "Только после проверки маржи",
      scorePenalty: 10,
    };
  }
  if (margin.marginPercent < 24 || packaging.riskLevel === "medium") {
    return {
      verdict: "Перспективно, но маржа требует проверки",
      chip: "Только после проверки маржи",
      scorePenalty: 0,
    };
  }
  if (margin.marginPercent >= 28) {
    return { verdict: "Ниша готова к тесту", chip: "Можно тестировать", scorePenalty: 0 };
  }
  return {
    verdict: "Можно тестировать с ограниченным бюджетом",
    chip: "Можно тестировать",
    scorePenalty: 3,
  };
}

export function calculateScoreBreakdown(
  input: RawResultInput,
  margin: MarginAnalysis,
  packaging: PackagingAnalysis,
): ScoreBreakdownItem[] {
  const avgCompetitorReviews =
    input.competitors.reduce((sum, item) => sum + item.reviews, 0) /
    input.competitors.length;
  const demand = Math.min(92, Math.round(84 + avgCompetitorReviews / 520));
  const competition = avgCompetitorReviews > 1600 ? 61 : 68;
  const marginScore = Math.max(35, Math.min(82, Math.round(margin.marginPercent * 3.3)));
  const logisticsScore = packaging.riskLevel === "high" ? 44 : packaging.riskLevel === "medium" ? 69 : 82;
  const cardQuality = Math.round(
    input.cardAuditSeed.reduce((sum, item) => sum + item.score, 0) /
      input.cardAuditSeed.length,
  );
  const seo = 76;
  const returns = packaging.fragility === "высокая" ? 45 : 70;

  return [
    ["demand", "Спрос", demand, "Стабильные продажи у конкурентов и высокая глубина отзывов."],
    ["competition", "Конкуренция", competition, "Топ выдачи занят сильными карточками, но есть разрыв по УТП."],
    ["margin", "Маржинальность", marginScore, "Маржа чувствительна к рекламе, упаковке и снижению цены."],
    ["logistics", "Логистика и упаковка", logisticsScore, "Габариты требуют проверки тарифов и упаковочного сценария."],
    ["card", "Качество карточки", cardQuality, "Карточка требует усиления визуала и характеристик."],
    ["seo", "SEO потенциал", seo, "Есть пространство для расширения ключевых запросов."],
    ["returns", "Риск возвратов", returns, "Возвраты нужно заложить в резерв до теста."],
  ].map(([key, label, score, note]) => ({
    key: String(key),
    label: String(label),
    score: Number(score),
    status: scoreStatus(Number(score)),
    note: String(note),
  }));
}

export function generateChecklist(
  margin: MarginAnalysis,
  packaging: PackagingAnalysis,
): string[] {
  const items = [
    "Проверить упаковку по актуальным правилам WB",
    "Подтвердить себестоимость у поставщика",
    "Сравнить топ-5 конкурентов по отзывам",
    "Добавить фото с размерами и сценарием использования",
    "Проверить спрос по ключевым словам через MPStats",
  ];

  if (margin.marginPercent < 22) {
    items.splice(3, 0, "Снизить целевую цену или усилить комплект");
    items.push("Не запускать, если маржа ниже 20%");
  }
  if (packaging.riskLevel !== "low") {
    items.splice(1, 0, "Запросить у поставщика точные габариты короба");
  }
  return items;
}

export function generateAiInsights(
  margin: MarginAnalysis,
  packaging: PackagingAnalysis,
): AiInsights {
  return {
    good: [
      "Есть спрос в среднем ценовом сегменте.",
      "Конкуренты часто проигрывают в описании и инфографике.",
    ],
    blockers: [
      margin.marginPercent < 22
        ? "Маржа ниже безопасного уровня при росте рекламы."
        : "Маржа рабочая, но требует контроля рекламного резерва.",
      packaging.riskLevel === "high"
        ? "Упаковка может съесть прибыль при возвратах."
        : "Логистика управляемая, но тарифы нужно сверить.",
    ],
    beforePurchase: [
      "Проверить MOQ, вес и размер короба у поставщика.",
      "Сверить комиссию и логистику WB на дату запуска.",
    ],
    firstTest: [
      "Запустить тест 30-50 единиц с ценой в безопасном диапазоне.",
      "Проверить CTR главного фото до масштабирования рекламы.",
    ],
  };
}

export function calculateResult(input: RawResultInput): ProductResult {
  const margin = calculateMargin(input.marginInput);
  const packaging = calculatePackagingRisk(input.packagingInput);
  const verdict = calculateVerdict(margin, packaging);
  const scoreBreakdown = calculateScoreBreakdown(input, margin, packaging);
  const score = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        scoreBreakdown.reduce((sum, item) => sum + item.score, 0) /
          scoreBreakdown.length + 6,
      ) - verdict.scorePenalty,
    ),
  );
  const cardAudit: CardAuditItem[] = input.cardAuditSeed.map((item) => ({
    ...item,
    status: scoreStatus(item.score),
  }));

  let domain = "";
  try {
    domain = new URL(input.supplier.supplierUrl).hostname.replace("www.", "");
  } catch {
    domain = "не определен";
  }

  return {
    nmId: input.nmId,
    title: input.title,
    category: input.category,
    score,
    verdict: verdict.verdict,
    verdictChip: verdict.chip,
    summary: input.summary,
    updatedAt: input.updatedAt,
    dataSources: input.dataSources,
    scoreBreakdown,
    competitors: input.competitors.slice(0, 5),
    marketMap: {
      xLabel: "Уровень цены: низкая → высокая",
      yLabel: "Сила отзывов / спроса: низкая → высокая",
      legend: [
        { label: "Окно возможности", riskLevel: "low", className: "bg-[var(--c-green)]" },
        { label: "Плотная зона", riskLevel: "medium", className: "bg-[var(--c-amber)]" },
        { label: "Риск позиции", riskLevel: "high", className: "bg-[var(--c-red)]" },
        { label: "Ваш товар", riskLevel: "user", className: "bg-[var(--c-text)]" },
      ],
    },
    margin,
    packaging,
    cardAudit,
    aiInsights: generateAiInsights(margin, packaging),
    checklist: generateChecklist(margin, packaging),
    supplier: {
      ...input.supplier,
      domain,
      requiresManualConfirmation: true,
    },
  };
}
