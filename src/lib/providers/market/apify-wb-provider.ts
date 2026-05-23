import "server-only";

import { searchSimilarProducts } from "@/services/marketDataProvider";
import { toWBProduct } from "@/lib/providers/market";
import type { MarketDataProvider } from "@/lib/providers/market/types";

export const apifyWbProvider: MarketDataProvider = {
  name: "apify",
  async searchSimilarProducts(query, options) {
    const result = await searchSimilarProducts(query, { limit: options?.limit ?? 50 });
    return result.competitors.map((product) => toWBProduct(product, query));
  },
  async getProviderHealth() {
    const ready = Boolean(process.env.APIFY_TOKEN ?? process.env.APIFY_API_TOKEN);
    return {
      name: "apify",
      available: ready,
      status: ready ? "ready" : "not_configured",
      message: ready ? process.env.APIFY_WB_ACTOR_ID ?? process.env.APIFY_WB_SEARCH_ACTOR_ID : "APIFY_TOKEN is missing.",
    };
  },
};
