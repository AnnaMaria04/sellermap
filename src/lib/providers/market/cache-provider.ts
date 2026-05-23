import "server-only";

import { isSupabaseConfigured } from "@/services/supabaseRest";
import { searchSimilarProducts } from "@/services/marketDataProvider";
import { toWBProduct } from "@/lib/providers/market";
import type { MarketDataProvider } from "@/lib/providers/market/types";

export const cacheProvider: MarketDataProvider = {
  name: "cache",
  async searchSimilarProducts(query, options) {
    const result = await searchSimilarProducts(query, { limit: options?.limit ?? 50 });
    return result.provider === "cache" ? result.competitors.map((product) => toWBProduct(product, query)) : [];
  },
  async getProviderHealth() {
    const ready = isSupabaseConfigured();
    return {
      name: "cache",
      available: ready,
      status: ready ? "ready" : "not_configured",
      message: ready ? "Supabase cache configured." : "Supabase service key is missing.",
    };
  },
};
