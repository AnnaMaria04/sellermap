export type EconomicsInput = {
  sellingPrice: number;
  productCost: number;
  currency: "RUB" | "USD" | "CNY";
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
};

export function calculateEconomics(input: EconomicsInput): EconomicsResult {
  const commission = input.sellingPrice * (input.commissionPercent / 100);
  const tax = input.sellingPrice * (input.taxPercent / 100);
  const adBudget = input.sellingPrice * (input.adBudgetPercent / 100);
  const returnReserve = input.sellingPrice * (input.returnReservePercent / 100);
  const totalCost =
    input.productCost +
    input.packagingCost +
    input.supplierDeliveryCost +
    commission +
    input.logisticsCost +
    input.storageCost +
    tax +
    adBudget +
    returnReserve;
  const profitPerUnit = input.sellingPrice - totalCost;
  const marginPercent = input.sellingPrice > 0 ? (profitPerUnit / input.sellingPrice) * 100 : 0;
  const variablePercent =
    (input.commissionPercent + input.returnReservePercent + input.taxPercent + input.adBudgetPercent) / 100;
  const fixedUnitCost =
    input.productCost +
    input.packagingCost +
    input.supplierDeliveryCost +
    input.logisticsCost +
    input.storageCost;
  const breakEvenPrice = variablePercent >= 1 ? Infinity : Math.ceil(fixedUnitCost / (1 - variablePercent));

  return {
    profitPerUnit: Math.round(profitPerUnit),
    marginPercent: Number(marginPercent.toFixed(1)),
    breakEvenPrice,
    safePriceMin: Number.isFinite(breakEvenPrice) ? Math.ceil(breakEvenPrice / 0.8) : Infinity,
    safePriceMax: Number.isFinite(breakEvenPrice) ? Math.ceil(breakEvenPrice / 0.7) : Infinity,
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
  };
}
