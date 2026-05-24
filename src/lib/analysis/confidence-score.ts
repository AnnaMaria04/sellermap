export type DataConfidenceInput = {
  daysOfHistory: number;
  snapshotCount: number;
  competitorsAnalyzed: number;
  hasReviewGrowth: boolean;
  hasRankHistory: boolean;
  hasStockSignal: boolean;
  source: "own-wb" | "apify" | "mpstats" | "seller_api" | "cache" | "manual" | "none";
  missingFields?: string[];
};

export type DataConfidenceScore = {
  score: number;
  level: "low" | "medium" | "high";
  drivers: string[];
  warnings: string[];
};

export function confidenceLevel(score: number): DataConfidenceScore["level"] {
  if (score <= 30) return "low";
  if (score <= 70) return "medium";
  return "high";
}

export function calculateHistoricalConfidence(input: DataConfidenceInput): DataConfidenceScore {
  const drivers: string[] = [];
  const warnings: string[] = [];
  let score = 10;

  if (input.source === "seller_api") {
    score += 35;
    drivers.push("Есть точные данные авторизованного seller API.");
  } else if (input.source === "mpstats") {
    score += 26;
    drivers.push("Используется лицензированный аналитический провайдер.");
  } else if (input.source === "own-wb" || input.source === "cache") {
    score += 18;
    drivers.push("Есть собственные или кэшированные WB-снимки.");
  } else if (input.source === "apify") {
    score += 14;
    drivers.push("Есть внешний WB-снимок через Apify.");
  } else {
    warnings.push("Рыночный источник не подключён.");
  }

  score += Math.min(18, input.daysOfHistory * 0.8);
  score += Math.min(14, input.snapshotCount * 2);
  score += Math.min(10, input.competitorsAnalyzed / 3);

  if (input.hasReviewGrowth) {
    score += 14;
    drivers.push("Есть динамика отзывов.");
  } else {
    warnings.push("Нет истории роста отзывов.");
  }

  if (input.hasRankHistory) {
    score += 8;
    drivers.push("Есть история позиции в поиске.");
  }
  if (input.hasStockSignal) {
    score += 6;
    drivers.push("Есть сигнал остатков.");
  }

  const missingPenalty = (input.missingFields?.length ?? 0) * 4;
  if (missingPenalty) warnings.push("Часть полей отсутствует или заполнена вручную.");
  score -= missingPenalty;

  const bounded = Math.max(0, Math.min(100, Math.round(score)));
  return { score: bounded, level: confidenceLevel(bounded), drivers, warnings };
}
