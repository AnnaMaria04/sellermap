import type { SupabaseClient } from "@supabase/supabase-js";
import type { InventoryState } from "@/contexts/InventoryContext";
import type { Database } from "./database.types";

type DB = SupabaseClient<Database>;

/**
 * Hybrid persistence. Each shop-scoped relational table also carries the full
 * app object in a `data` jsonb column, keyed by the app's string id (`app_id`)
 * and scoped to the seller's shop (`org_id`, enforced by RLS). The app reads
 * and writes `data` directly — no lossy mapping — while the relational columns
 * stay for querying and are normalised feature-by-feature over time.
 */
const TABLES = {
  products: "products",
  suppliers: "suppliers",
  locations: "locations",
  purchaseOrders: "purchase_orders",
  transfers: "transfers",
  stocktakes: "stocktakes",
  movements: "stock_movements",
  reservations: "reservations",
  returns: "returns",
  bundles: "bundles",
  replenishmentRules: "replenishment_rules",
  batches: "inventory_batches",
  orders: "orders",
  customers: "customers",
  staff: "staff_members",
  promotions: "promotions",
} as const;

type Collection = keyof typeof TABLES;
const COLLECTIONS = Object.keys(TABLES) as Collection[];

/** A few relational columns mirrored from the object so they aren't empty. */
function mirroredColumns(table: string, item: Record<string, unknown>): Record<string, unknown> {
  const cols: Record<string, unknown> = {};
  if (typeof item.name === "string") cols.name = item.name;
  if (table === "orders" && typeof item.orderNumber === "string") cols.order_number = item.orderNumber;
  if (table === "stock_movements" && typeof item.type === "string") cols.type = item.type;
  return cols;
}

/**
 * Reads the seller's full workspace from the `data` columns.
 * Returns null for a brand-new shop (zero rows anywhere). Per-table errors are
 * skipped so a missing/locked table never blocks the rest of the load.
 */
export async function loadWorkspace(
  supabase: DB,
  orgId: string,
): Promise<Partial<InventoryState> | null> {
  const results = await Promise.all(
    COLLECTIONS.map((c) => supabase.from(TABLES[c]).select("data").eq("org_id", orgId)),
  );

  let total = 0;
  const state: Partial<Record<Collection, unknown[]>> = {};
  COLLECTIONS.forEach((c, i) => {
    const { data, error } = results[i];
    if (error) return;
    const rows = (data ?? [])
      .map((r) => (r as { data: unknown }).data)
      .filter((d): d is object => d != null);
    state[c] = rows;
    total += rows.length;
  });

  if (total === 0) return null;
  return state as Partial<InventoryState>;
}

/** Upserts all rows for one collection, then deletes rows no longer present. */
async function syncCollection(
  supabase: DB,
  orgId: string,
  collection: Collection,
  items: { id: string }[],
) {
  const table = TABLES[collection];

  if (items.length > 0) {
    const rows = items.map((item) => ({
      org_id: orgId,
      app_id: item.id,
      data: item,
      ...mirroredColumns(table, item as Record<string, unknown>),
    }));
    const { error } = await supabase.from(table).upsert(rows as never, { onConflict: "org_id,app_id" });
    if (error) throw error;
  }

  // Orders are append-only: never deleted by the seller's full-sync. This both
  // matches the channel-sync policy (orders are cancelled, never removed) and
  // keeps externally-inserted orders — e.g. public storefront checkouts that
  // land directly in the DB while the seller's app is open — from being wiped.
  if (collection === "orders") return;

  const keepIds = items.map((i) => i.id);
  let del = supabase.from(table).delete().eq("org_id", orgId);
  if (keepIds.length > 0) {
    del = del.not("app_id", "in", `(${keepIds.map((id) => `"${id}"`).join(",")})`);
  }
  const { error } = await del;
  if (error) throw error;
}

/** Persists the entire workspace. Called debounced from the provider. */
export async function saveWorkspace(
  supabase: DB,
  orgId: string,
  state: InventoryState,
): Promise<void> {
  await Promise.all(
    COLLECTIONS.map((c) => syncCollection(supabase, orgId, c, state[c] as { id: string }[])),
  );
}
