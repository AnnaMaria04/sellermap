import "server-only";

import { WB_API_BASES, wbFetch } from "./client";

export type WbGoodsFilterParams = {
  limit?: number;
  offset?: number;
  nmID?: number;
};

export type WbProductResponse = Record<string, unknown>;

export function getSellerGoodsByFilter(params: WbGoodsFilterParams = {}) {
  return wbFetch<WbProductResponse>("/api/v2/list/goods/filter", {
    baseUrl: WB_API_BASES.prices,
    query: {
      limit: params.limit ?? 10,
      offset: params.offset ?? 0,
      nmID: params.nmID,
    },
  });
}

export function getSellerCardsList(limit = 10) {
  return wbFetch<WbProductResponse>("/content/v2/get/cards/list", {
    baseUrl: WB_API_BASES.content,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      settings: {
        cursor: { limit },
        filter: { withPhoto: -1 },
      },
    }),
  });
}
