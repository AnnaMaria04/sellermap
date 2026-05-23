import type { EconomicsInput, EconomicsResult } from "@/types/sellermap";

export function validateEconomicsInput(input: Partial<EconomicsInput>) {
  const required: Array<keyof EconomicsInput> = [
    "sellingPrice",
    "productCost",
    "packagingCost",
    "supplierDeliveryCost",
    "commissionPercent",
    "logisticsCost",
    "storageCost",
    "returnReservePercent",
    "taxPercent",
    "adBudgetPercent",
  ];
  const missing = required.filter((key) => typeof input[key] !== "number" || !Number.isFinite(input[key]));
  const negative = required.filter((key) => typeof input[key] === "number" && Number(input[key]) < 0);
  return { ok: missing.length === 0 && negative.length === 0 && Boolean(input.currency), missing, negative };
}

export function calculateBreakEvenPrice(input: EconomicsInput) {
  const percentCosts =
    (input.commissionPercent + input.returnReservePercent + input.taxPercent + input.adBudgetPercent) / 100;
  const fixedCosts =
    input.productCost +
    input.packagingCost +
    input.supplierDeliveryCost +
    input.logisticsCost +
    input.storageCost;
  return percentCosts >= 1 ? Infinity : Math.ceil(fixedCosts / (1 - percentCosts));
}

export function calculateSafePriceRange(input: EconomicsInput) {
  const breakEvenPrice = calculateBreakEvenPrice(input);
  return {
    safePriceMin: Number.isFinite(breakEvenPrice) ? Math.ceil(breakEvenPrice * 1.15) : Infinity,
    safePriceMax: Math.ceil(input.sellingPrice * 1.25),
  };
}

export function calculateUnitEconomics(input: EconomicsInput): EconomicsResult {
  const commission = input.sellingPrice * (input.commissionPercent / 100);
  const tax = input.sellingPrice * (input.taxPercent / 100);
  const adBudget = input.sellingPrice * (input.adBudgetPercent / 100);
  const returnReserve = input.sellingPrice * (input.returnReservePercent / 100);
  const totalCosts =
    input.productCost +
    input.packagingCost +
    input.supplierDeliveryCost +
    commission +
    input.logisticsCost +
    input.storageCost +
    tax +
    adBudget +
    returnReserve;
  const profitPerUnit = input.sellingPrice - totalCosts;
  const breakEvenPrice = calculateBreakEvenPrice(input);
  const safeRange = calculateSafePriceRange(input);
  const warnings = [
    ...(input.currency !== "RUB" ? ["Цена поставщика в USD/CNY. Для финального расчёта нужен курс валюты."] : []),
    ...(profitPerUnit / input.sellingPrice < 0.2 ? ["Маржа ниже 20%, требуется проверка цены, логистики или себестоимости."] : []),
  ];

  return {
    profitPerUnit: Math.round(profitPerUnit),
    marginPercent: Number(((profitPerUnit / input.sellingPrice) * 100).toFixed(1)),
    breakEvenPrice,
    safePriceMin: safeRange.safePriceMin,
    safePriceMax: safeRange.safePriceMax,
    costBreakdown: {
      productCost: input.productCost,
      commission: Math.round(commission),
      logistics: input.logisticsCost,
      storage: input.storageCost,
      packaging: input.packagingCost,
      supplierDelivery: input.supplierDeliveryCost,
      tax: Math.round(tax),
      adBudget: Math.round(adBudget),
      returnReserve: Math.round(returnReserve),
    },
    warnings,
  };
}
