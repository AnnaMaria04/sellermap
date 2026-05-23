import "server-only";

import { getMpstatsItems } from "@/services/mpstatsClient";
import { normalizeMpstatsResponse } from "@/services/marketDataProvider";
import { toWBProduct } from "@/lib/providers/market";
import type { MarketDataProvider } from "@/lib/providers/market/types";

export const mpstatsProvider: MarketDataProvider = {
  name: "mpstats",
  async searchSimilarProducts(query, options) {
    const result = await getMpstatsItems({ market: "wb", keyword: query, startRow: 0, endRow: options?.limit ?? 50 });
    if (!result.ok) return [];
    return normalizeMpstatsResponse(result.data).map((product) => toWBProduct(product, query));
  },
  async getProviderHealth() {
    const ready = Boolean(process.env.MPSTATS_API_KEY ?? process.env.MPSTATS_API_TOKEN);
    return {
      name: "mpstats",
      available: ready,
      status: ready ? "ready" : "not_configured",
      message: ready ? "MPStats key configured." : "MPSTATS_API_KEY is missing.",
    };
  },
};
