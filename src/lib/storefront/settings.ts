/**
 * Storefront (website builder) settings + published catalog snapshot.
 *
 * MVP persistence is localStorage so the seller's «Витрина» builder and the
 * public `/store` page share state in the same browser without backend plumbing.
 * The published products are snapshotted here so the public store is
 * self-contained (no auth / no InventoryProvider needed on the storefront).
 */
export interface StoreProduct {
  id: string;
  name: string;
  price: number;
  image?: string;
  description?: string;
  category?: string;
}

export interface StorefrontSettings {
  name: string;
  tagline: string;
  accent: string;          // seller's brand accent (hex)
  contact: string;         // phone / email / @telegram
  published: boolean;
  products: StoreProduct[];
  /**
   * The seller's shop id, snapshotted by the builder so the public `/store`
   * page can route checkouts to the right back office via the service-role
   * checkout endpoint. Null until the builder has loaded with a backend.
   */
  orgId?: string | null;
}

export const STOREFRONT_KEY = "sellermap_storefront";

export const DEFAULT_STOREFRONT: StorefrontSettings = {
  name: "Мой магазин",
  tagline: "Качественные товары с доставкой",
  accent: "#16a34a",
  contact: "",
  published: false,
  products: [],
  orgId: null,
};

export const ACCENT_PRESETS = ["#16a34a", "#1f6feb", "#7c3aed", "#db2777", "#ea580c", "#0891b2"];

export function loadStorefront(): StorefrontSettings {
  if (typeof window === "undefined") return DEFAULT_STOREFRONT;
  try {
    const raw = localStorage.getItem(STOREFRONT_KEY);
    return raw ? { ...DEFAULT_STOREFRONT, ...JSON.parse(raw) } : DEFAULT_STOREFRONT;
  } catch {
    return DEFAULT_STOREFRONT;
  }
}

export function saveStorefront(s: StorefrontSettings) {
  try { localStorage.setItem(STOREFRONT_KEY, JSON.stringify(s)); } catch {}
}

export interface StoreOrder {
  number: string;
  createdAt: string;
  customer: { name: string; phone: string; address: string };
  items: { id: string; name: string; price: number; qty: number }[];
  total: number;
}

export const STORE_ORDERS_KEY = "sellermap_store_orders";

/** Mirror the order into localStorage (offline log / no-backend fallback). */
export function recordStoreOrder(order: StoreOrder) {
  try {
    const raw = localStorage.getItem(STORE_ORDERS_KEY);
    const list: StoreOrder[] = raw ? JSON.parse(raw) : [];
    list.unshift(order);
    localStorage.setItem(STORE_ORDERS_KEY, JSON.stringify(list.slice(0, 200)));
  } catch {}
}

export interface CheckoutResult {
  /** The order number to show the shopper. */
  number: string;
  /** True when the order was persisted to the seller's back office. */
  persisted: boolean;
}

/**
 * Submit a storefront checkout. When the storefront carries an `orgId` it POSTs
 * to the service-role checkout endpoint so the order lands in the seller's back
 * office (anon RLS can't insert into `orders`). Always mirrors to localStorage
 * so there's a record even when there's no backend or the request fails.
 */
export async function submitStoreOrder(
  s: StorefrontSettings,
  draft: { customer: StoreOrder["customer"]; items: StoreOrder["items"]; total: number },
): Promise<CheckoutResult> {
  if (s.orgId) {
    try {
      const res = await fetch("/api/store/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: s.orgId,
          customer: draft.customer,
          items: draft.items.map((i) => ({ id: i.id, qty: i.qty })),
        }),
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; orderNumber?: string } | null;
      if (res.ok && json?.ok && json.orderNumber) {
        recordStoreOrder({ number: json.orderNumber, createdAt: new Date().toISOString(), ...draft });
        return { number: json.orderNumber, persisted: true };
      }
    } catch {
      // Network/server failure — fall through to the local-only record.
    }
  }

  const number = `S${Date.now().toString().slice(-6)}`;
  recordStoreOrder({ number, createdAt: new Date().toISOString(), ...draft });
  return { number, persisted: false };
}
