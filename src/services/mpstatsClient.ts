import "server-only";

type MpstatsMarket = "wb" | "oz";

const BASE_URLS: Record<MpstatsMarket, string> = {
  wb: "https://mpstats.io/api/analytics/v1/wb",
  oz: "https://mpstats.io/api/analytics/v1/oz",
};

function token() {
  return process.env.MPSTATS_API_KEY ?? process.env.MPSTATS_API_TOKEN;
}

export async function mpstatsRequest<T>(input: {
  market: MpstatsMarket;
  path: string;
  method?: "GET" | "POST";
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
}) {
  const apiKey = token();
  if (!apiKey) {
    return { ok: false as const, status: "not_configured" as const, error: "MPStats API key is not configured." };
  }
  const params = new URLSearchParams();
  Object.entries(input.query ?? {}).forEach(([key, value]) => {
    if (value !== undefined) params.set(key, String(value));
  });
  const query = params.toString();
  const response = await fetch(`${BASE_URLS[input.market]}${input.path}${query ? `?${query}` : ""}`, {
    method: input.method ?? "GET",
    headers: {
      "X-Mpstats-TOKEN": apiKey,
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: input.body ? JSON.stringify(input.body) : undefined,
    next: { revalidate: 300 },
  });
  if (!response.ok) {
    return { ok: false as const, status: "failed" as const, error: `MPStats returned ${response.status}` };
  }
  return { ok: true as const, status: "success" as const, data: (await response.json()) as T };
}

export function getMpstatsItems(input: { market: MpstatsMarket; keyword?: string; ids?: string; startRow?: number; endRow?: number }) {
  return mpstatsRequest({
    market: input.market,
    path: "/items",
    method: "POST",
    query: {
      keyword: input.keyword,
      ids: input.ids,
      startRow: input.startRow ?? 0,
      endRow: input.endRow ?? 30,
    },
  });
}

export function getMpstatsItemFull(market: MpstatsMarket, id: string) {
  return mpstatsRequest({ market, path: `/items/${id}/full` });
}
