import type { DataConfidenceResult, ProductAnalysisDraft } from "@/types/sellermap";

export function calculateDataConfidence(draft: ProductAnalysisDraft): DataConfidenceResult {
  let score = 100;
  const missingCriticalFields: string[] = [];
  const confidenceDrivers: string[] = [];
  const confidenceWarnings: string[] = [];

  if (draft.importStatus === "partial") {
    score -= 15;
    confidenceWarnings.push("Импорт поставщика частичный.");
  }
  if ((draft.importConfidence ?? 0) < 0.55) {
    score -= 25;
    confidenceWarnings.push("Низкая уверенность совпадения товара.");
  }
  if (!draft.product.weight) {
    score -= 10;
    missingCriticalFields.push("вес");
  }
  if (!draft.product.dimensions) {
    score -= 10;
    missingCriticalFields.push("габариты");
  }
  if (!draft.product.supplierDeliveryCost) {
    score -= 15;
    missingCriticalFields.push("доставка поставщика");
  }
  if (draft.fieldSources.commissionPercent === "manual") score -= 10;
  if (draft.fieldSources.logisticsCost !== "wb_api") score -= 15;
  if (!draft.market || draft.market.status !== "success") {
    score -= 25;
    confidenceWarnings.push("Рыночные данные не подключены.");
  }
  if (draft.market?.provider === "demo") score -= 20;
  if (draft.product.currency !== "RUB" && draft.fieldSources.exchangeRateToRub === "manual") score -= 5;
  if (draft.product.images.length > 0) score -= 5;

  if (draft.economics) confidenceDrivers.push("Экономика рассчитана.");
  if (draft.market?.status === "success") confidenceDrivers.push("Есть данные рынка.");
  if (draft.commission?.source === "wb_api") confidenceDrivers.push("Комиссия из WB API.");

  const bounded = Math.max(0, Math.min(100, Math.round(score)));
  return {
    score: bounded,
    level: bounded >= 75 ? "high" : bounded >= 50 ? "medium" : "low",
    missingCriticalFields,
    confidenceDrivers,
    confidenceWarnings,
  };
}
