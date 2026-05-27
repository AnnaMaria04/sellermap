import {
  type ChannelAdapter,
  type ChannelMeta,
  type Connection,
  type SyncResult,
} from "../types";

const OZON_META: ChannelMeta = {
  kind: "ozon",
  name: "Ozon",
  authModel: "Client-Id + Api-Key (заголовки)",
  credentialFields: [
    { key: "clientId", label: "Client-Id", type: "text", hint: "Seller API → Настройки → API-ключи" },
    { key: "apiKey", label: "Api-Key", type: "password" },
  ],
  docsUrl: "https://docs.ozon.ru/api/seller",
  capabilities: ["products", "stock", "prices", "orders"],
};

interface ProductsResponse {
  ok: boolean;
  message?: string;
  count?: number;
  products?: { externalId: string; name: string; sku?: string; barcode?: string; price?: number }[];
}

async function callProducts(clientId: string, apiKey: string, test: boolean): Promise<ProductsResponse> {
  const res = await fetch("/api/integrations/ozon/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, apiKey, test }),
  });
  return (await res.json().catch(() => ({ ok: false, message: "Некорректный ответ сервера" }))) as ProductsResponse;
}

/** Live Ozon adapter (Seller API). Mirrors the WB adapter: cards/prices via the
 *  server route; stock/push are stubbed until added. */
export const ozonAdapter: ChannelAdapter = {
  meta: OZON_META,

  async testConnection(conn: Connection) {
    const clientId = conn.credentials.clientId?.trim();
    const apiKey = conn.credentials.apiKey?.trim();
    if (!clientId || !apiKey) return { ok: false, message: "Введите Client-Id и Api-Key" };
    const r = await callProducts(clientId, apiKey, true);
    return { ok: r.ok, message: r.ok ? "Подключение к Ozon установлено" : (r.message ?? "Ошибка подключения") };
  },

  async pullProducts(conn: Connection): Promise<SyncResult> {
    const clientId = conn.credentials.clientId?.trim();
    const apiKey = conn.credentials.apiKey?.trim();
    if (!clientId || !apiKey) return { entity: "products", ok: false, count: 0, message: "Введите Client-Id и Api-Key" };
    const r = await callProducts(clientId, apiKey, false);
    return {
      entity: "products",
      ok: r.ok,
      count: r.count ?? r.products?.length ?? 0,
      products: r.products,
      message: r.ok ? `Загружено товаров: ${r.count ?? r.products?.length ?? 0}` : r.message,
    };
  },

  async pullStock(): Promise<SyncResult> {
    return { entity: "stock", ok: false, count: 0, message: "Синхронизация остатков Ozon будет добавлена" };
  },

  async pushStock(): Promise<SyncResult> {
    return { entity: "stock", ok: false, count: 0, message: "Отправка остатков в Ozon пока не поддерживается" };
  },
};
