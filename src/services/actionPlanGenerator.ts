import type { ActionItem, DecisionResult, ProductAnalysisDraft } from "@/types/sellermap";

export function generateActionPlan(draft: ProductAnalysisDraft, _decision?: DecisionResult): ActionItem[] {
  void _decision;
  const actions: ActionItem[] = [];
  if (!draft.product.weight) {
    actions.push({
      priority: "high",
      title: "Уточнить вес товара",
      reason: "Без веса логистика WB может быть рассчитана неверно.",
      action: "Запросите у поставщика вес одной единицы и вес упаковки.",
      source: "rule_based",
    });
  }
  if (!draft.product.dimensions) {
    actions.push({
      priority: "high",
      title: "Запросить габариты упаковки",
      reason: "Габариты влияют на тариф логистики и хранения.",
      action: "Получите длину, ширину и высоту товара и транспортной упаковки.",
      source: "rule_based",
    });
  }
  if (!draft.product.supplierDeliveryCost) {
    actions.push({
      priority: "high",
      title: "Получить точную стоимость доставки партии",
      reason: "Доставка поставщика меняет landed cost и маржу.",
      action: "Запросите стоимость доставки партии до склада или фулфилмента.",
      source: "rule_based",
    });
  }
  if (!draft.market || draft.market.status !== "success") {
    actions.push({
      priority: "medium",
      title: "Добавить WB конкурентов или подключить MPStats",
      reason: "Без конкурентов нельзя оценить насыщенность рынка и барьер отзывов.",
      action: "Введите 3-10 конкурентов вручную или подключите MPStats.",
      source: "rule_based",
    });
  }
  if ((draft.economics?.marginPercent ?? 0) < 20) {
    actions.push({
      priority: "high",
      title: "Проверить цену закупки или поднять цену продажи",
      reason: "Маржа ниже безопасного уровня.",
      action: "Снизьте себестоимость, логистику или проверьте более высокую цену WB.",
      source: "rule_based",
    });
  }
  if (!draft.product.commissionPercent) {
    actions.push({
      priority: "high",
      title: "Выбрать категорию WB или ввести комиссию",
      reason: "Комиссия нужна для честной экономики.",
      action: "Подберите категорию WB и подтвердите процент комиссии.",
      source: "rule_based",
    });
  }
  if (draft.product.images.length > 0) {
    actions.push({
      priority: "medium",
      title: "Подготовить WB-ready изображения",
      reason: "Изображения поставщика являются референсом, а не готовым контентом WB.",
      action: "Проверьте формат, размер, уникальность и требования WB.",
      source: "rule_based",
    });
  }
  return actions;
}
