import {
  type ChannelAdapter,
  type ChannelMeta,
  type Connection,
  type SyncResult,
  type StockUpdate,
  type RawExternalProduct,
} from "../types";

/**
 * Mock adapters that simulate marketplace/ERP sync without a backend.
 * Each carries the REAL auth model + credential fields + docs URL, so the
 * connect UI is accurate; only the network calls are simulated. Swap the
 * `pull*`/`push*` bodies for live HTTPS calls (server-side) to go live.
 */

const SAMPLE: RawExternalProduct[] = [
  { externalId: "ext-1001", name: "Органайзер для путешествий", sku: "ORG-001", barcode: "4680001234567", price: 2950, stock: 64 },
  { externalId: "ext-1002", name: "Футболка оверсайз хлопок", sku: "TSH-OV-002", barcode: "4680002234567", price: 1890, stock: 120 },
  { externalId: "ext-1003", name: "Bluetooth наушники TW-Pro 500", sku: "TWS-500", barcode: "4680008234567", price: 4990, stock: 38 },
];

function delay<T>(value: T, ms = 400): Promise<T> {
  return new Promise((res) => setTimeout(() => res(value), ms));
}

function makeMockAdapter(meta: ChannelMeta): ChannelAdapter {
  return {
    meta,
    async testConnection(conn: Connection) {
      const missing = meta.credentialFields.filter((f) => !conn.credentials[f.key]?.trim());
      if (missing.length) {
        return delay({ ok: false, message: `Заполните: ${missing.map((m) => m.label).join(", ")}` });
      }
      return delay({ ok: true, message: "Соединение установлено (демо)" });
    },
    async pullProducts() {
      return delay<SyncResult>({ entity: "products", ok: true, count: SAMPLE.length, products: SAMPLE });
    },
    async pullStock() {
      return delay<SyncResult>({ entity: "stock", ok: true, count: SAMPLE.length, products: SAMPLE });
    },
    async pushStock(_conn: Connection, updates: StockUpdate[]) {
      return delay<SyncResult>({ entity: "stock", ok: true, count: updates.length, message: `Остатки отправлены: ${updates.length}` });
    },
  };
}

export const wildberriesAdapter = makeMockAdapter({
  kind: "wildberries",
  name: "Wildberries",
  authModel: "JWT-токен по категориям (Контент, Маркетплейс, Статистика, Цены)",
  credentialFields: [
    { key: "contentToken", label: "Токен «Контент»", type: "password", hint: "Личный кабинет → Настройки → Доступ к API" },
    { key: "marketplaceToken", label: "Токен «Маркетплейс»", type: "password" },
    { key: "statisticsToken", label: "Токен «Статистика»", type: "password" },
  ],
  docsUrl: "https://dev.wildberries.ru",
  capabilities: ["products", "stock", "prices", "orders"],
});

export const ozonAdapter = makeMockAdapter({
  kind: "ozon",
  name: "Ozon",
  authModel: "Client-Id + Api-Key (заголовки)",
  credentialFields: [
    { key: "clientId", label: "Client-Id", type: "text", hint: "Seller API → Ключи" },
    { key: "apiKey", label: "Api-Key", type: "password" },
  ],
  docsUrl: "https://docs.ozon.ru/api/seller",
  capabilities: ["products", "stock", "prices", "orders"],
});

export const yandexMarketAdapter = makeMockAdapter({
  kind: "yandex_market",
  name: "Яндекс Маркет",
  authModel: "API-ключ (businessId / campaignId)",
  credentialFields: [
    { key: "apiKey", label: "API-ключ", type: "password" },
    { key: "businessId", label: "businessId", type: "text" },
    { key: "campaignId", label: "campaignId", type: "text" },
  ],
  docsUrl: "https://yandex.ru/dev/market/partner-api",
  capabilities: ["products", "stock", "prices", "orders"],
});

export const moyskladAdapter = makeMockAdapter({
  kind: "moysklad",
  name: "МойСклад",
  authModel: "Bearer-токен или Basic (login:password)",
  credentialFields: [
    { key: "token", label: "Токен доступа", type: "password", hint: "Профиль → Доступ к API" },
  ],
  docsUrl: "https://dev.moysklad.ru/doc/api/remap/1.2",
  capabilities: ["products", "stock", "prices"],
});
