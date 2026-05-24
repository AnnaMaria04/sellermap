import type { UnitEconomicsResult } from "@/lib/analysis/economics";
import type { MarketAnalysis } from "@/lib/analysis/market-analysis";
import type { ProductFingerprint } from "@/lib/analysis/product-fingerprint";
import type { SupplierProduct } from "@/lib/providers/supplier/types";

export type DecisionResult = {
  opportunityScore: number;
  verdict: "strong_opportunity" | "can_test" | "research_more" | "risky" | "reject" | "worth_testing" | "avoid" | "needs_more_data";
  verdictLabel: string;
  confidenceLevel: "low" | "medium" | "high";
  suggestedFirstBatchSize: {
    min: number;
    max: number;
    reason: string;
  };
  mainReasons: string[];
  mainRisks: string[];
  improvementActions: string[];
  pricingRecommendation: {
    entryPrice: number | null;
    targetPrice: number | null;
    premiumCeiling: number | null;
    explanation: string;
  };
};

function marginScore(margin: number) {
  if (margin < 0) return 0;
  if (margin < 10) return 20;
  if (margin < 20) return 45;
  if (margin < 35) return 75;
  return 92;
}

function pricePositionScore(economics: UnitEconomicsResult, market: MarketAnalysis) {
  const median = market.priceStats.median;
  if (!median) return 45;
  if (economics.targetPriceRub > median * 1.25) return 35;
  if (economics.targetPriceRub >= median * 0.85 && economics.targetPriceRub <= median * 1.15) return 85;
  return 65;
}

export function makeDecision(input: {
  supplier: SupplierProduct;
  fingerprint: ProductFingerprint;
  market: MarketAnalysis;
  economics: UnitEconomicsResult;
}): DecisionResult {
  const { supplier, fingerprint, market, economics } = input;
  const missingSupplierCost = !Number.isFinite(supplier.supplierPriceMin ?? NaN) || (supplier.supplierPriceMin ?? 0) <= 0 || economics.supplierUnitCost <= 0;
  const missingPackaging = !supplier.packageSize || !supplier.grossWeightKg;
  const competitionRisk = 100 - market.competition.competitionScore;
  const concentrationScore =
    market.sellerConcentration.concentrationLevel === "low"
      ? 85
      : market.sellerConcentration.concentrationLevel === "medium"
        ? 60
        : market.sellerConcentration.concentrationLevel === "high"
          ? 35
          : 45;
  const differentiationPotential = Math.min(90, 45 + fingerprint.differentiationAngles.length * 12);
  const rawOpportunityScore = Math.round(
    market.demand.demandScore * 0.25 +
      marginScore(economics.marginPercent) * 0.25 +
      competitionRisk * 0.2 +
      concentrationScore * 0.15 +
      pricePositionScore(economics, market) * 0.1 +
      differentiationPotential * 0.05,
  );
  const opportunityScore = missingSupplierCost ? Math.min(45, rawOpportunityScore) : missingPackaging ? Math.min(70, rawOpportunityScore) : rawOpportunityScore;
  const missingMarket = market.competitors.length < 5;
  const verdict =
    missingSupplierCost
      ? "needs_more_data"
      : missingMarket
      ? "research_more"
      : economics.marginPercent < 10 || opportunityScore < 55
        ? "reject"
        : opportunityScore >= 82 && economics.marginPercent >= 25
          ? "strong_opportunity"
          : opportunityScore >= 70 && economics.marginPercent >= 18
            ? "can_test"
          : "risky";
  const confidenceLevel = missingSupplierCost || missingMarket ? "low" : missingPackaging && market.confidenceLevel === "high" ? "medium" : market.confidenceLevel;
  const batch =
      verdict === "strong_opportunity"
      ? { min: 50, max: 100, reason: "Маржа и рыночные сигналы достаточны для аккуратного теста." }
      : verdict === "risky" || verdict === "can_test"
        ? { min: 20, max: 50, reason: "Есть спрос, но нужно ограничить риск первой закупки." }
        : verdict === "research_more" || verdict === "needs_more_data"
          ? { min: 10, max: 20, reason: "Недостаточно данных рынка, допустим только минимальный тест." }
          : { min: 0, max: 0, reason: "Покупку лучше отложить до улучшения экономики или дифференциации." };

  return {
    opportunityScore,
    verdict,
    verdictLabel:
      verdict === "strong_opportunity"
        ? "Сильная возможность"
        : verdict === "can_test"
          ? "Можно тестировать"
          : verdict === "research_more"
            ? "Нужно исследовать"
            : verdict === "needs_more_data"
              ? "Нужно больше данных"
              : verdict === "reject"
              ? "Отклонить"
              : verdict === "risky"
          ? "Рискованно"
          : "Нужно больше данных",
    confidenceLevel,
    suggestedFirstBatchSize: batch,
    mainReasons: [
      `Спрос: ${market.demand.demandLevel}, score ${market.demand.demandScore}/100`,
      missingSupplierCost ? "Себестоимость поставщика не найдена — маржа заблокирована" : `Маржа: ${economics.marginPercent}% при цене ${economics.targetPriceRub} ₽`,
      `Медиана WB: ${market.priceStats.median ? `${market.priceStats.median} ₽` : "нет данных"}`,
    ],
    mainRisks: [
      ...(missingSupplierCost ? ["Нет подтверждённой цены поставщика"] : []),
      `Конкуренция: ${market.competition.competitionLevel}`,
      `Барьер отзывов: ${market.reviewStats.entryReviewBarrier}`,
      ...(missingPackaging ? ["Вес или габариты упаковки не подтверждены"] : []),
    ].slice(0, 3),
    improvementActions: [
      "Подтвердить вес, габариты упаковки и доставку у поставщика.",
      "Сравнить топ-10 WB карточек по фото, отзывам и комплектации.",
      "Заложить тестовую цену между безопасной ценой и медианой рынка.",
    ],
    pricingRecommendation: {
      entryPrice: economics.recommendedEntryPriceRub,
      targetPrice: economics.recommendedTargetPriceRub,
      premiumCeiling: economics.premiumCeilingRub,
      explanation: "Цена строится от точки безубыточности, безопасной маржи и квартилей WB конкурентов.",
    },
  };
}
