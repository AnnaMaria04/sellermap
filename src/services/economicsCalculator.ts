import type { EconomicsInput, EconomicsResult, PriceScenario } from "@/types/sellermap";

function productCost(input: EconomicsInput) {
  return input.productCostRub ?? input.productCost ?? 0;
}

function logisticsCost(input: EconomicsInput) {
  return input.wbLogisticsCost ?? input.logisticsCost ?? 0;
}

export function validateEconomicsInput(input: Partial<EconomicsInput>) {
  const normalized = {
    ...input,
    productCostRub: input.productCostRub ?? input.productCost,
    wbLogisticsCost: input.wbLogisticsCost ?? input.logisticsCost,
  };
  const required = [
    "sellingPrice",
    "productCostRub",
    "packagingCost",
    "supplierDeliveryCost",
    "commissionPercent",
    "wbLogisticsCost",
    "storageCost",
    "returnReservePercent",
    "taxPercent",
    "adBudgetPercent",
  ] as const;
  const missing = required.filter((key) => typeof normalized[key] !== "number" || !Number.isFinite(normalized[key]));
  const negative = required.filter((key) => typeof normalized[key] === "number" && Number(normalized[key]) < 0);
  const invalidPercent = ["commissionPercent", "returnReservePercent", "taxPercent", "adBudgetPercent"].filter((key) => {
    const value = normalized[key as keyof typeof normalized];
    return typeof value === "number" && (value < 0 || value > 100);
  });
  return {
    ok: missing.length === 0 && negative.length === 0 && invalidPercent.length === 0 && Boolean(input.currency) && Number(input.sellingPrice) > 0,
    missing,
    negative,
    invalidPercent,
  };
}

export function calculateBreakEvenPrice(input: EconomicsInput) {
  const percentCosts =
    (input.commissionPercent + input.returnReservePercent + input.taxPercent + input.adBudgetPercent) / 100;
  const fixedCosts =
    productCost(input) +
    input.packagingCost +
    input.supplierDeliveryCost +
    logisticsCost(input) +
    input.storageCost;
  return percentCosts >= 1 ? Infinity : Math.ceil(fixedCosts / (1 - percentCosts));
}

export function calculateMinimumSafePrice(result: Pick<EconomicsResult, "breakEvenPrice">) {
  return Number.isFinite(result.breakEvenPrice) ? Math.ceil(result.breakEvenPrice * 1.15) : Infinity;
}

export function calculateSafePriceRange(input: EconomicsInput) {
  const breakEvenPrice = calculateBreakEvenPrice(input);
  return {
    safePriceMin: Number.isFinite(breakEvenPrice) ? Math.ceil(breakEvenPrice * 1.15) : Infinity,
    safePriceMax: Math.ceil(input.sellingPrice * 1.25),
  };
}

export function calculateMaxAdBudget(input: EconomicsInput) {
  const withoutAds = {
    ...input,
    adBudgetPercent: 0,
  };
  const breakEvenWithoutAds = calculateBreakEvenPrice(withoutAds);
  return Math.max(0, Math.floor(input.sellingPrice - breakEvenWithoutAds));
}

export function calculateMaxSupplierCost(input: EconomicsInput) {
  const commission = input.sellingPrice * (input.commissionPercent / 100);
  const tax = input.sellingPrice * (input.taxPercent / 100);
  const adBudget = input.sellingPrice * (input.adBudgetPercent / 100);
  const returnReserve = input.sellingPrice * (input.returnReservePercent / 100);
  const targetProfit = input.sellingPrice * 0.2;
  return Math.max(
    0,
    Math.floor(
      input.sellingPrice -
        targetProfit -
        input.packagingCost -
        input.supplierDeliveryCost -
        commission -
        logisticsCost(input) -
        input.storageCost -
        tax -
        adBudget -
        returnReserve,
    ),
  );
}

export function buildEconomicsWarnings(input: EconomicsInput, result: EconomicsResult) {
  return [
    ...(input.currency !== "RUB" ? ["Цена поставщика в USD/CNY. Для финального расчёта нужен курс валюты."] : []),
    ...(result.marginPercent < 20 ? ["Маржа ниже 20%, требуется проверка цены, логистики или себестоимости."] : []),
    ...(result.profitPerUnit < 0 ? ["Расчёт показывает убыток на единицу товара."] : []),
  ];
}

export function calculateUnitEconomics(input: EconomicsInput): EconomicsResult {
  const costRub = productCost(input);
  const wbLogisticsCost = logisticsCost(input);
  const commission = input.sellingPrice * (input.commissionPercent / 100);
  const tax = input.sellingPrice * (input.taxPercent / 100);
  const adBudget = input.sellingPrice * (input.adBudgetPercent / 100);
  const returnReserve = input.sellingPrice * (input.returnReservePercent / 100);
  const landedCostRub = costRub + input.packagingCost + input.supplierDeliveryCost;
  const totalCosts =
    landedCostRub +
    commission +
    wbLogisticsCost +
    input.storageCost +
    tax +
    adBudget +
    returnReserve;
  const profitPerUnit = input.sellingPrice - totalCosts;
  const breakEvenPrice = calculateBreakEvenPrice(input);
  const base: Omit<EconomicsResult, "warnings"> = {
    landedCostRub: Math.round(landedCostRub),
    totalCosts: Math.round(totalCosts),
    profitPerUnit: Math.round(profitPerUnit),
    marginPercent: Number(((profitPerUnit / input.sellingPrice) * 100).toFixed(1)),
    breakEvenPrice,
    minimumSafePrice: Number.isFinite(breakEvenPrice) ? Math.ceil(breakEvenPrice * 1.15) : Infinity,
    maxAdBudgetRub: calculateMaxAdBudget(input),
    maxSupplierCostRub: calculateMaxSupplierCost(input),
    safePriceMin: Number.isFinite(breakEvenPrice) ? Math.ceil(breakEvenPrice * 1.15) : Infinity,
    safePriceMax: Math.ceil(input.sellingPrice * 1.25),
    costBreakdown: {
      productCost: costRub,
      productCostRub: costRub,
      commission: Math.round(commission),
      logistics: wbLogisticsCost,
      wbLogisticsCost,
      storage: input.storageCost,
      packaging: input.packagingCost,
      packagingCost: input.packagingCost,
      supplierDelivery: input.supplierDeliveryCost,
      supplierDeliveryCost: input.supplierDeliveryCost,
      tax: Math.round(tax),
      adBudget: Math.round(adBudget),
      returnReserve: Math.round(returnReserve),
    },
  };
  return { ...base, warnings: buildEconomicsWarnings(input, base as EconomicsResult) };
}

export function generatePriceScenarios(input: {
  plannedSellingPrice: number;
  marketMedianPrice?: number | null;
  economicsInput: EconomicsInput;
}): PriceScenario[] {
  const basePrices = input.marketMedianPrice
    ? [
        input.marketMedianPrice,
        input.plannedSellingPrice,
        Math.round(input.plannedSellingPrice * 0.9),
        Math.round(input.plannedSellingPrice * 1.1),
      ]
    : [
        Math.round(input.plannedSellingPrice * 0.8),
        Math.round(input.plannedSellingPrice * 0.9),
        input.plannedSellingPrice,
        Math.round(input.plannedSellingPrice * 1.1),
        Math.round(input.plannedSellingPrice * 1.2),
      ];
  const uniquePrices = [...new Set(basePrices.filter((price) => price > 0))].sort((a, b) => a - b);
  return uniquePrices.map((price) => {
    const result = calculateUnitEconomics({ ...input.economicsInput, sellingPrice: price });
    const status =
      result.marginPercent < 0
        ? "loss"
        : result.marginPercent < 20
          ? "risky"
          : result.marginPercent < 35
            ? "healthy"
            : input.marketMedianPrice && price > input.marketMedianPrice * 1.2
              ? "above_market"
              : "strong";
    return {
      price,
      profitPerUnit: result.profitPerUnit,
      marginPercent: result.marginPercent,
      status,
      note:
        status === "loss"
          ? "убыток"
          : status === "risky"
            ? "рискованно"
            : status === "above_market"
              ? "выше рынка"
              : status === "strong"
                ? "сильная маржа"
                : "здоровая маржа",
    };
  });
}
