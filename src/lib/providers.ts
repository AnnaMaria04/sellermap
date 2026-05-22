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
    description: "MVP path for seller-entered product, price, and packaging data.",
  },
  {
    name: "CSVUploadProvider",
    status: "ready",
    description: "Prepared for report imports and admin-uploaded rule tables.",
  },
  {
    name: "WBSellerAPIProvider",
    status: "placeholder",
    description: "Official seller-authorized Wildberries data connection.",
  },
  {
    name: "MPStatsProvider",
    status: "placeholder",
    description: "Optional analytics provider, not required for MVP.",
  },
  {
    name: "YandexAIProvider",
    status: "placeholder",
    description: "Structured summaries for recommendations and weekly updates.",
  },
];
