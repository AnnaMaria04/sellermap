import { generateActionPlan } from "@/services/actionPlanGenerator";
import type { DataConfidenceResult, DecisionResult, DecisionScores, ProductAnalysisDraft } from "@/types/sellermap";

function profitScore(margin: number) {
  if (margin < 0) return 0;
  if (margin < 10) return 20;
  if (margin < 20) return 45;
  if (margin < 30) return 70;
  return 90;
}

function marketScore(draft: ProductAnalysisDraft) {
  if (!draft.market?.marketStats) return 40;
  const median = draft.market.marketStats.medianPrice;
  const planned = draft.product.plannedSellingPrice;
  if (!median || !planned) return 50;
  if (planned > median * 1.25) return 35;
  if (planned >= median * 0.85 && planned <= median * 1.15) return 80;
  return 60;
}

function competitionScore(draft: ProductAnalysisDraft) {
  const stats = draft.market?.marketStats;
  if (!stats) return 45;
  if (stats.marketDifficulty === "high") return 35;
  if (stats.marketDifficulty === "medium") return 60;
  if (stats.marketDifficulty === "low") return 82;
  return 45;
}

function readinessScore(draft: ProductAnalysisDraft) {
  const required = [
    draft.product.productCostRub,
    draft.product.plannedSellingPrice,
    draft.product.commissionPercent,
    draft.product.logisticsCost,
    draft.product.packagingCost,
    draft.marketTarget,
  ];
  return Math.round((required.filter(Boolean).length / required.length) * 100);
}

export function analyzeDecision(draft: ProductAnalysisDraft, confidence: DataConfidenceResult): DecisionResult {
  const margin = draft.economics?.marginPercent ?? -1;
  const scores: DecisionScores = {
    profit: profitScore(margin),
    market: marketScore(draft),
    competition: competitionScore(draft),
    risk: Math.max(0, 100 - confidence.missingCriticalFields.length * 18),
    launchReadiness: readinessScore(draft),
    dataConfidence: confidence.score,
    overall: 0,
  };
  scores.overall = Math.round(
    scores.profit * 0.3 +
      scores.market * 0.2 +
      scores.competition * 0.15 +
      scores.risk * 0.15 +
      scores.launchReadiness * 0.1 +
      scores.dataConfidence * 0.1,
  );

  const blockers = [
    ...confidence.missingCriticalFields.map((field) => `Не заполнено: ${field}`),
    ...(margin < 10 ? ["Маржа ниже 10%"] : []),
    ...(!draft.market || draft.market.status !== "success" ? ["Нет реальных данных рынка"] : []),
  ];

  const decision =
    margin < 10
      ? "do_not_buy"
      : blockers.length && confidence.score < 70
        ? "wait_more_data"
        : margin > 25 && confidence.score > 70 && draft.market?.marketStats?.marketDifficulty !== "high"
          ? "buy"
          : margin > 20 && confidence.score >= 50
            ? "test_only"
            : "wait_more_data";
  const label =
    decision === "buy"
      ? "Можно запускать"
      : decision === "test_only"
        ? "Тестировать небольшой партией"
        : decision === "do_not_buy"
          ? "Не покупать"
          : "Нужно больше данных";

  const partial: DecisionResult = {
    decision,
    label,
    overallScore: scores.overall,
    scores,
    topReasons: [
      `Маржа: ${margin >= 0 ? `${margin}%` : "не рассчитана"}`,
      `Уверенность данных: ${confidence.score}%`,
      draft.market?.marketStats ? `Сложность рынка: ${draft.market.marketStats.marketDifficulty}` : "Рынок не подключён",
    ],
    blockers,
    nextActions: [],
  };
  return { ...partial, nextActions: generateActionPlan(draft, partial) };
}
