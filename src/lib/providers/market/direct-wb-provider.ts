import "server-only";

import { getWbPublicMarketByKeyword } from "@/services/wbPublicClient";
import { toWBProduct } from "@/lib/providers/market";
import type { MarketDataProvider } from "@/lib/providers/market/types";

export const directWbProvider: MarketDataProvider = {
  name: "direct-wb",
  async searchSimilarProducts(query, options) {
    if (process.env.ENABLE_DIRECT_WB_PROVIDER !== "true") return [];
    const result = await getWbPublicMarketByKeyword(query, options?.limit ?? 50);
    return result.competitors.map((product) => toWBProduct(product, query));
  },
  async getProviderHealth() {
    const enabled = process.env.ENABLE_DIRECT_WB_PROVIDER === "true";
    return {
      name: "wb_public",
      available: enabled,
      status: enabled ? "ready" : "disabled",
      message: "Direct WB is a development fallback only and may be blocked.",
    };
  },
};
