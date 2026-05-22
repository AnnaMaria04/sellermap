export type ProductDataProvider =
  | "ManualInputProvider"
  | "CSVUploadProvider"
  | "WBSellerAPIProvider"
  | "MPStatsProvider"
  | "YandexAIProvider";

export const dataProviders: Array<{
  name: ProductDataProvider;
  status: "active" | "ready" | "placeholder";
  description: string;
}> = [
  {
    name: "ManualInputProvider",
    status: "active",
    description: "Ручной ввод данных продавца: товар, цена, упаковка.",
  },
  {
    name: "CSVUploadProvider",
    status: "ready",
    description: "Импорт отчётов и таблиц правил администратора.",
  },
  {
    name: "WBSellerAPIProvider",
    status: "placeholder",
    description: "Официальное подключение через кабинет продавца WB.",
  },
  {
    name: "MPStatsProvider",
    status: "placeholder",
    description: "Аналитика конкурентов, продажи, позиции, SEO.",
  },
  {
    name: "YandexAIProvider",
    status: "placeholder",
    description: "Сводки, рекомендации и еженедельные правила через YandexGPT.",
  },
];
