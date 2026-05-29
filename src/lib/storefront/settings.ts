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
}

export const STOREFRONT_KEY = "sellermap_storefront";

export const DEFAULT_STOREFRONT: StorefrontSettings = {
  name: "Мой магазин",
  tagline: "Качественные товары с доставкой",
  accent: "#16a34a",
  contact: "",
  published: false,
  products: [],
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

export function recordStoreOrder(order: StoreOrder) {
  try {
    const raw = localStorage.getItem(STORE_ORDERS_KEY);
    const list: StoreOrder[] = raw ? JSON.parse(raw) : [];
    list.unshift(order);
    localStorage.setItem(STORE_ORDERS_KEY, JSON.stringify(list.slice(0, 200)));
  } catch {}
}
