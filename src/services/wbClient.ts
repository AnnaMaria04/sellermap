import "server-only";

type WbApiArea = "content" | "analytics" | "prices" | "common";

const WB_BASE_URLS: Record<WbApiArea, string> = {
  content: "https://content-api.wildberries.ru",
  analytics: "https://seller-analytics-api.wildberries.ru",
  prices: "https://discounts-prices-api.wildberries.ru",
  common: "https://common-api.wildberries.ru",
};

export type WbClientResult<T> =
  | { ok: true; data: T; statusCode: number; rateLimitRemaining?: string | null }
  | { ok: false; error: string; statusCode: number; retryAfter?: string | null; rateLimitRemaining?: string | null };

function wbToken() {
  return process.env.WB_API_TOKEN;
}

function explainStatus(status: number) {
  if (status === 401) return "WB token не авторизован.";
  if (status === 403) return "У WB token нет прав на этот раздел.";
  if (status === 404) return "WB endpoint не найден или ресурс недоступен.";
  if (status === 409) return "WB вернул конфликт запроса.";
  if (status === 429) return "Превышен лимит запросов WB.";
  if (status >= 500) return "Ошибка на стороне WB API.";
  return `WB API вернул статус ${status}.`;
}

export async function wbClient<T>(
  area: WbApiArea,
  path: string,
  init: RequestInit = {},
): Promise<WbClientResult<T>> {
  const token = wbToken();
  if (!token) {
    return { ok: false, error: "WB_API_TOKEN не задан.", statusCode: 401 };
  }

  try {
    const response = await fetch(`${WB_BASE_URLS[area]}${path}`, {
      ...init,
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
      next: { revalidate: 300 },
    });
    const rateLimitRemaining = response.headers.get("x-ratelimit-remaining");
    const retryAfter = response.headers.get("retry-after");

    if (!response.ok) {
      return {
        ok: false,
        error: explainStatus(response.status),
        statusCode: response.status,
        retryAfter,
        rateLimitRemaining,
      };
    }

    const text = await response.text();
    const data = text ? (JSON.parse(text) as T) : ({} as T);
    return { ok: true, data, statusCode: response.status, rateLimitRemaining };
  } catch {
    return { ok: false, error: "Не удалось выполнить запрос к WB API.", statusCode: 502 };
  }
}

export async function pingWbArea(area: WbApiArea) {
  const result = await wbClient(area, "/ping");
  return result.ok;
}
