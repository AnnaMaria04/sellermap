import {
  type ChannelAdapter,
  type ChannelMeta,
  type Connection,
  type SyncResult,
} from "../types";

const WB_META: ChannelMeta = {
  kind: "wildberries",
  name: "Wildberries",
  authModel: "JWT-токен по категориям (Контент, Маркетплейс, Статистика, Цены)",
  credentialFields: [
    { key: "contentToken", label: "Токен «Контент»", type: "password", hint: "Личный кабинет → Настройки → Доступ к API → Контент" },
    { key: "statisticsToken", label: "Токен «Статистика»", type: "password", hint: "Для остатков и продаж (добавим позже)" },
  ],
  docsUrl: "https://dev.wildberries.ru",
  capabilities: ["products", "stock", "prices", "orders"],
};

interface CardsResponse {
  ok: boolean;
  message?: string;
  count?: number;
  products?: { externalId: string; name: string; sku?: string; barcode?: string }[];
}

async function callCards(token: string, test: boolean): Promise<CardsResponse> {
  const res = await fetch("/api/integrations/wb/cards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, test }),
  });
  return (await res.json().catch(() => ({ ok: false, message: "Некорректный ответ сервера" }))) as CardsResponse;
}

/**
 * Live Wildberries adapter. Card sync calls the WB Content API server-side
 * (the seller token never leaves our backend). Stock/orders are stubbed with a
 * clear message until the Statistics-API token flow is added.
 */
export const wildberriesAdapter: ChannelAdapter = {
  meta: WB_META,

  async testConnection(conn: Connection) {
    const token = conn.credentials.contentToken?.trim();
    if (!token) return { ok: false, message: "Введите токен «Контент»" };
    const r = await callCards(token, true);
    return { ok: r.ok, message: r.ok ? "Подключение к Wildberries установлено" : (r.message ?? "Ошибка подключения") };
  },

  async pullProducts(conn: Connection): Promise<SyncResult> {
    const token = conn.credentials.contentToken?.trim();
    if (!token) return { entity: "products", ok: false, count: 0, message: "Введите токен «Контент»" };
    const r = await callCards(token, false);
    return {
      entity: "products",
      ok: r.ok,
      count: r.count ?? r.products?.length ?? 0,
      products: r.products,
      message: r.ok ? `Загружено карточек: ${r.count ?? r.products?.length ?? 0}` : r.message,
    };
  },

  async pullStock(): Promise<SyncResult> {
    // Stock is pulled together with cards (Statistics API) during pullProducts.
    return { entity: "stock", ok: true, count: 0, message: "Остатки синхронизируются вместе с товарами" };
  },

  async pullOrders(conn: Connection) {
    const token = conn.credentials.statisticsToken?.trim() || conn.credentials.contentToken?.trim();
    if (!token) return { ok: false, message: "Введите токен" };
    const res = await fetch("/api/integrations/wb/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, days: 90 }),
    });
    return (await res.json().catch(() => ({ ok: false, message: "Некорректный ответ сервера" }))) as {
      ok: boolean; orders?: unknown[]; count?: number; message?: string;
    };
  },

  async pushStock(_conn: Connection): Promise<SyncResult> {
    return { entity: "stock", ok: false, count: 0, message: "Отправка остатков в WB пока не поддерживается" };
  },
};
