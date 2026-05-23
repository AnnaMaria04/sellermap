import type { ProductAnalysisDraft, Recommendation } from "@/types/sellermap";

export async function buildRecommendations(draft: ProductAnalysisDraft) {
  const recommendations: Recommendation[] = [];
  if (draft.economics && draft.economics.marginPercent < 20) {
    recommendations.push({
      priority: "high",
      title: "Маржа ниже безопасного уровня",
      reason: "При текущей цене и расходах товар может не выдержать рекламу и возвраты.",
      action: "Проверьте себестоимость, логистику и цену продажи до закупки партии.",
      expectedImpact: "Снижение риска убыточного запуска.",
    });
  }
  if (!draft.product.dimensions) {
    recommendations.push({
      priority: "high",
      title: "Не указаны габариты",
      reason: "Без габаритов нельзя точно оценить логистику WB.",
      action: "Запросите у поставщика размер товара и упаковки.",
      expectedImpact: "Более точный расчёт логистики и маржи.",
    });
  }
  if (draft.product.images.length > 0) {
    recommendations.push({
      priority: "medium",
      title: "Проверить изображения перед WB",
      reason: "Фото поставщика являются референсом и не готовы к загрузке на WB автоматически.",
      action: "Пропустите изображения через media validation и подготовьте WB-контент.",
      expectedImpact: "Меньше риска отклонения карточки и слабого CTR.",
    });
  }
  if (!draft.market || draft.market.status !== "success") {
    recommendations.push({
      priority: "medium",
      title: "Подключить рыночные данные",
      reason: "Без MPStats нельзя честно оценить насыщенность, барьер отзывов и цены конкурентов.",
      action: "Подключите MPStats или включите явный демо-режим.",
      expectedImpact: "Более точный go/no-go вывод.",
    });
  }

  return {
    provider: process.env.YANDEX_GPT_API_KEY && process.env.YANDEX_FOLDER_ID ? "yandex_gpt" : "rule_based",
    status: process.env.YANDEX_GPT_API_KEY && process.env.YANDEX_FOLDER_ID ? "success" : "not_configured",
    recommendations,
  };
}
