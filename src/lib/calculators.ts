export type MarginInput = {
  sellingPrice: number;
  productCost: number;
  commission: number;
  logisticsCost: number;
  packagingCost: number;
  adsReserve: number;
  returnReserve: number;
};

export function calculateMargin(input: MarginInput) {
  const costs =
    input.productCost +
    input.commission +
    input.logisticsCost +
    input.packagingCost +
    input.adsReserve +
    input.returnReserve;
  const netProfit = input.sellingPrice - costs;
  const netMargin = (netProfit / input.sellingPrice) * 100;

  return {
    ...input,
    netProfit,
    netMargin,
    breakEvenPrice: costs,
    safePriceMin: Math.ceil(costs / 0.8),
    safePriceMax: Math.ceil(costs / 0.7),
  };
}

export function calculateOpportunityScore(parts: {
  demandScore: number;
  competitionScore: number;
  marginScore: number;
  cardQualityScore: number;
  riskScore: number;
}) {
  return Math.max(
    0,
    Math.min(
      100,
      parts.demandScore +
        parts.competitionScore +
        parts.marginScore +
        parts.cardQualityScore +
        parts.riskScore,
    ),
  );
}
