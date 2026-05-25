import type {
  AccountingType,
  BusinessType,
  LocationKind,
  MovementType,
  NotificationEventType,
  PurchaseOrderStatus,
  RecommendationAction,
  SalesChannel,
} from "./foundation";

export const businessTypeRu: Record<BusinessType, string> = {
  retail_store: "Розничный магазин",
  online_offline: "Онлайн + офлайн",
  coffee_shop: "Кофейня",
  small_production: "Малое производство",
  marketplace_seller: "Маркетплейс-продавец",
};

export const salesChannelRu: Record<SalesChannel, string> = {
  pos: "POS / касса",
  website: "Сайт",
  telegram: "Telegram",
  instagram: "Instagram",
  delivery: "Доставка",
  wildberries: "Wildberries",
  ozon: "Ozon",
  yandex_market: "Яндекс Маркет",
};

export const locationKindRu: Record<LocationKind, string> = {
  warehouse: "Склад",
  store: "Магазин",
  showroom: "Витрина",
  backroom: "Подсобка",
  online_reserve: "Онлайн-резерв",
  damaged: "Брак",
  returns: "Возвраты",
  in_transit: "В пути",
  marketplace_allocation: "Под маркетплейс",
};

export const accountingTypeRu: Record<AccountingType, string> = {
  product: "Товар",
  ingredient: "Ингредиент",
  bundle: "Комплект",
  recipe: "Рецепт",
  consumable: "Расходник",
  packaging: "Упаковка",
};

export const movementTypeRu: Record<MovementType, string> = {
  receipt: "Поступление",
  sale: "Продажа",
  reserve: "Резерв",
  release_reserve: "Снятие резерва",
  return: "Возврат",
  write_off: "Списание",
  transfer: "Перемещение",
  adjustment: "Корректировка",
  stocktake: "Инвентаризация",
  marking: "Маркировка",
  purchase_price_change: "Изменение закупочной цены",
};

export const purchaseOrderStatusRu: Record<PurchaseOrderStatus, string> = {
  draft: "Черновик",
  sent: "Отправлен",
  confirmed: "Подтверждён",
  in_transit: "В пути",
  partially_received: "Частично принят",
  closed: "Закрыт",
  problem: "Проблема",
};

export const recommendationActionRu: Record<RecommendationAction, string> = {
  order_now: "Заказать сейчас",
  do_not_reorder: "Не закупать снова",
  discount: "Распродать",
  transfer: "Переместить",
  raise_price: "Повысить цену",
  check_supplier: "Проверить поставщика",
  check_marking: "Проверить маркировку",
  run_stocktake: "Провести пересчёт",
  replace_supplier: "Заменить поставщика",
  decrease_purchase: "Уменьшить закупку",
  increase_purchase: "Увеличить закупку",
};

export const notificationTypeRu: Record<NotificationEventType, string> = {
  low_stock: "Товар заканчивается",
  expiring_soon: "Скоро истекает срок",
  supplier_price_increased: "Поставщик поднял цену",
  margin_dropped: "Маржа упала",
  stock_discrepancy: "Найдено расхождение",
  dead_stock: "Товар завис",
  partial_supplier_delivery: "Поставка пришла не полностью",
  marking_problem: "Проблема с маркировкой",
  stocktake_due: "Нужен пересчёт",
  reorder_due: "Пора сделать заказ",
};
