import { type SalesChannel } from "@/mock/inventory";

/**
 * Integration layer — one adapter contract every external system implements.
 * Adapters normalize each provider's schema into the canonical types below so
 * the rest of the app never sees provider-specific wire formats.
 */

export type ChannelKind =
  | "wildberries"
  | "ozon"
  | "yandex_market"
  | "moysklad"
  | "1c"
  | "cdek"
  | "yookassa";

export type ConnectionStatus = "disconnected" | "connected" | "syncing" | "error";

/** Describes the credentials a provider needs (rendered as a connect form). */
export interface CredentialField {
  key: string;
  label: string;
  type: "text" | "password";
  hint?: string;
}

export interface ChannelMeta {
  kind: ChannelKind;
  name: string;
  /** Auth model summary, shown in the UI. */
  authModel: string;
  credentialFields: CredentialField[];
  docsUrl: string;
  capabilities: SyncEntity[];
}

export type SyncEntity = "products" | "stock" | "prices" | "orders";

export interface Connection {
  kind: ChannelKind;
  credentials: Record<string, string>;
  channel?: SalesChannel;     // which internal sales channel this maps to
  autoSync: boolean;
  intervalMinutes: number;
}

export interface RawExternalProduct {
  externalId: string;         // provider id (WB nmId, Ozon sku, …)
  name: string;
  sku?: string;
  barcode?: string;
  price?: number;
  stock?: number;
}

export interface StockUpdate {
  sku: string;
  externalId?: string;
  quantity: number;
}

export interface SyncLogEntry {
  at: string;
  entity: SyncEntity;
  status: "ok" | "error";
  count: number;
  message?: string;
}

export interface SyncResult {
  entity: SyncEntity;
  ok: boolean;
  count: number;
  message?: string;
  products?: RawExternalProduct[];
}

/** The contract every channel adapter implements. */
export interface ChannelAdapter {
  meta: ChannelMeta;
  /** Validate credentials (cheap call). */
  testConnection(conn: Connection): Promise<{ ok: boolean; message?: string }>;
  pullProducts(conn: Connection): Promise<SyncResult>;
  pullStock(conn: Connection): Promise<SyncResult>;
  pushStock(conn: Connection, updates: StockUpdate[]): Promise<SyncResult>;
  /** Optional: pull orders/sales already mapped to the app Order shape. */
  pullOrders?(conn: Connection): Promise<{ ok: boolean; orders?: unknown[]; count?: number; message?: string }>;
}
