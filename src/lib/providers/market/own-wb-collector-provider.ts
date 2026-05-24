import "server-only";

import type { MarketDataProvider, ProviderHealth } from "@/lib/providers/market/types";
import { callOwnCollectorProduct, callOwnCollectorSearch, isOwnCollectorConfigured, ownCollectorBaseUrl } from "@/lib/providers/market/own-wb-client";

export const ownWbCollectorProvider: MarketDataProvider = {
  name: "own-wb",
  async searchSimilarProducts(query, options) {
    const result = await callOwnCollectorSearch(query, options?.limit ?? 30);
    return result.items.map((item) => ({
      ...item,
      source: "own-wb" as const,
      searchKeyword: item.searchKeyword || query,
    }));
  },
  async getProductDetails(nmId) {
    const result = await callOwnCollectorProduct(nmId);
    return result.product ? { ...result.product, source: "own-wb" as const } : null;
  },
  async getProviderHealth() {
    const configured = isOwnCollectorConfigured();
    const health: ProviderHealth & { reachable?: boolean; configured?: boolean } = {
      name: "own-wb",
      available: false,
      status: configured ? "failed" : "not_configured",
      message: configured ? undefined : "OWN_WB_COLLECTOR_BASE_URL / OWN_WB_COLLECTOR_API_KEY missing or collector disabled.",
      configured,
      reachable: false,
    };
    if (!configured) return health;
    try {
      const response = await fetch(`${ownCollectorBaseUrl()}/health`, { cache: "no-store", signal: AbortSignal.timeout(5000) });
      health.reachable = response.ok;
      health.available = response.ok;
      health.status = response.ok ? "ready" : "failed";
      health.message = response.ok ? "own WB collector reachable" : `Health returned ${response.status}`;
      return health;
    } catch (error) {
      health.message = error instanceof Error ? error.message : "own WB collector health failed";
      return health;
    }
  },
};
