import type { MarketAnalysis } from "@/lib/analysis/market-analysis";
import type { SupplierProduct } from "@/lib/providers/supplier/types";

export type UnitEconomicsInput = {
  supplierUnitCost: number;
  currency: string;
  fxRate: number;
  shippingPerUnitRub: number;
  packagingCostRub: number;
  customsBufferPercent: number;
  wbCommissionPercent: number;
  wbLogisticsRub: number;
  returnBufferPercent: number;
  adSpendPercent: number;
  taxPercent: number;
  targetPriceRub: number;
};

export type UnitEconomicsResult = UnitEconomicsInput & {
  landedCostRub: number;
  revenueAfterCommission: number;
  adSpendRub: number;
  returnBufferRub: number;
  taxRub: number;
  customsBufferRub: number;
  totalCostRub: number;
  profitPerUnitRub: number;
  marginPercent: number;
  breakEvenPriceRub: number;
  minimumSafePriceRub: number;
  recommendedEntryPriceRub: number | null;
  recommendedTargetPriceRub: number | null;
  premiumCeilingRub: number | null;
  warnings: string[];
};

function defaultFx(currency?: string | null) {
  if (currency === "CNY") return 12.5;
  if (currency === "EUR") return 98;
  if (currency === "USD") return 90;
  return 1;
}

function logisticsEstimate(product: SupplierProduct) {
  const weight = product.grossWeightKg ?? 0;
  const sides = product.packageSize ? [product.packageSize.lengthCm, product.packageSize.widthCm, product.packageSize.heightCm] : [];
  if (sides.some((side) => (side ?? 0) > 120)) return 350;
  if (weight > 5) return 180;
  if (weight > 1) return 125;
  if (weight > 0.5) return 90;
  return 65;
}

function breakEven(input: UnitEconomicsInput) {
  const fixed =
    input.supplierUnitCost * input.fxRate +
    input.shippingPerUnitRub +
    input.packagingCostRub +
    input.wbLogisticsRub;
  const percent =
    (input.customsBufferPercent +
      input.wbCommissionPercent +
      input.returnBufferPercent +
      input.adSpendPercent +
      input.taxPercent) /
    100;
  return percent >= 1 ? Infinity : Math.ceil(fixed / (1 - percent));
}

export function buildEconomicsInput(
  supplier: SupplierProduct,
  market: MarketAnalysis,
  overrides: Partial<UnitEconomicsInput> = {},
): UnitEconomicsInput {
  const currency = overrides.currency ?? supplier.currency ?? "USD";
  const fxRate = overrides.fxRate ?? defaultFx(currency);
  const supplierUnitCost = overrides.supplierUnitCost ?? supplier.supplierPriceMin ?? 0;
  const targetPriceRub =
    overrides.targetPriceRub ??
    market.priceStats.median ??
    Math.round(supplierUnitCost * fxRate * 3.5);
  return {
    supplierUnitCost,
    currency,
    fxRate,
    shippingPerUnitRub: overrides.shippingPerUnitRub ?? (Math.round((supplier.shippingPerUnit ?? 0) * fxRate) || 120),
    packagingCostRub: overrides.packagingCostRub ?? 35,
    customsBufferPercent: overrides.customsBufferPercent ?? 5,
    wbCommissionPercent: overrides.wbCommissionPercent ?? 15,
    wbLogisticsRub: overrides.wbLogisticsRub ?? logisticsEstimate(supplier),
    returnBufferPercent: overrides.returnBufferPercent ?? 5,
    adSpendPercent: overrides.adSpendPercent ?? 10,
    taxPercent: overrides.taxPercent ?? 6,
    targetPriceRub,
  };
}

export function calculateUnitEconomics(input: UnitEconomicsInput, market?: MarketAnalysis): UnitEconomicsResult {
  const productCostRub = input.supplierUnitCost * input.fxRate;
  const customsBufferRub = input.targetPriceRub * (input.customsBufferPercent / 100);
  const landedCostRub = productCostRub + input.shippingPerUnitRub + input.packagingCostRub + customsBufferRub;
  const commissionRub = input.targetPriceRub * (input.wbCommissionPercent / 100);
  const adSpendRub = input.targetPriceRub * (input.adSpendPercent / 100);
  const returnBufferRub = input.targetPriceRub * (input.returnBufferPercent / 100);
  const taxRub = input.targetPriceRub * (input.taxPercent / 100);
  const revenueAfterCommission = input.targetPriceRub - commissionRub;
  const totalCostRub =
    landedCostRub +
    commissionRub +
    input.wbLogisticsRub +
    returnBufferRub +
    adSpendRub +
    taxRub;
  const profitPerUnitRub = input.targetPriceRub - totalCostRub;
  const breakEvenPriceRub = breakEven(input);
  const minimumSafePriceRub = Math.ceil(breakEvenPriceRub * 1.15);
  const recommendedEntryPriceRub = market?.priceStats.p25 ?? minimumSafePriceRub;
  const recommendedTargetPriceRub = market?.priceStats.median ?? Math.max(minimumSafePriceRub, input.targetPriceRub);
  const premiumCeilingRub = market?.priceStats.p75 ?? Math.round(input.targetPriceRub * 1.25);
  return {
    ...input,
    landedCostRub: Math.round(landedCostRub),
    revenueAfterCommission: Math.round(revenueAfterCommission),
    adSpendRub: Math.round(adSpendRub),
    returnBufferRub: Math.round(returnBufferRub),
    taxRub: Math.round(taxRub),
    customsBufferRub: Math.round(customsBufferRub),
    totalCostRub: Math.round(totalCostRub),
    profitPerUnitRub: Math.round(profitPerUnitRub),
    marginPercent: Number(((profitPerUnitRub / input.targetPriceRub) * 100).toFixed(1)),
    breakEvenPriceRub,
    minimumSafePriceRub,
    recommendedEntryPriceRub,
    recommendedTargetPriceRub,
    premiumCeilingRub,
    warnings: [
      ...(profitPerUnitRub < 0 ? ["Текущая цена даёт убыток."] : []),
      ...(profitPerUnitRub / input.targetPriceRub < 0.2 ? ["Маржа ниже 20%, запуск рискован."] : []),
      ...(!market?.priceStats.median ? ["Медиана рынка недоступна, цена рассчитана от себестоимости."] : []),
    ],
  };
}
