import "server-only";

const OZON_BASE_URL = "https://api-seller.ozon.ru";

function credentials() {
  return {
    clientId: process.env.OZON_CLIENT_ID,
    apiKey: process.env.OZON_API_KEY,
  };
}

export async function ozonRequest<T>(input: { path: string; body?: unknown }) {
  const { clientId, apiKey } = credentials();
  if (!clientId || !apiKey) {
    return { ok: false as const, status: "not_configured" as const, error: "OZON_CLIENT_ID или OZON_API_KEY не задан." };
  }
  const response = await fetch(`${OZON_BASE_URL}${input.path}`, {
    method: "POST",
    headers: {
      "Client-Id": clientId,
      "Api-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input.body ?? {}),
    next: { revalidate: 300 },
  });
  if (!response.ok) {
    return { ok: false as const, status: "failed" as const, error: `Ozon API returned ${response.status}` };
  }
  return { ok: true as const, status: "success" as const, data: (await response.json()) as T };
}

export function pingOzon() {
  return ozonRequest({ path: "/v1/product/info/attributes", body: { filter: { offer_id: [] }, limit: 1 } });
}

export function getOzonProductInfo(productId: number) {
  return ozonRequest({ path: "/v2/product/info", body: { product_id: productId } });
}
