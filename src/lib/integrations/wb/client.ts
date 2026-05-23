import "server-only";

export type WbApiStatus = "connected" | "missing_token" | "error";

export type WbApiResult<T> = {
  ok: boolean;
  status: WbApiStatus;
  data?: T;
  error?: string;
  fetchedAt: string;
};

type WbFetchOptions = RequestInit & {
  baseUrl?: string;
  query?: Record<string, string | number | boolean | undefined>;
};

export const WB_API_BASES = {
  tariffs: "https://common-api.wildberries.ru",
  content: "https://content-api.wildberries.ru",
  prices: "https://discounts-prices-api.wildberries.ru",
} as const;

export function hasWbToken() {
  return Boolean(process.env.WB_API_TOKEN);
}

export function missingWbToken<T>(): WbApiResult<T> {
  return {
    ok: false,
    status: "missing_token",
    error: "WB_API_TOKEN не задан",
    fetchedAt: new Date().toISOString(),
  };
}

export async function wbFetch<T>(
  path: string,
  { baseUrl = WB_API_BASES.tariffs, query, headers, ...init }: WbFetchOptions = {},
): Promise<WbApiResult<T>> {
  const token = process.env.WB_API_TOKEN;
  const fetchedAt = new Date().toISOString();

  if (!token) return missingWbToken<T>();

  try {
    const url = new URL(path, baseUrl);
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }

    const response = await fetch(url, {
      ...init,
      headers: {
        Authorization: token,
        ...headers,
      },
      next: { revalidate: 300 },
    });

    const text = await response.text();
    const data = text ? (JSON.parse(text) as T) : ({} as T);

    if (!response.ok) {
      return {
        ok: false,
        status: "error",
        data,
        error: `WB API вернул статус ${response.status}`,
        fetchedAt,
      };
    }

    return { ok: true, status: "connected", data, fetchedAt };
  } catch (error) {
    return {
      ok: false,
      status: "error",
      error: error instanceof Error ? error.message : "Ошибка WB API",
      fetchedAt,
    };
  }
}
