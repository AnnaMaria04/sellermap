import type { SupabaseClient } from "@supabase/supabase-js";
import type { InventoryState } from "@/contexts/InventoryContext";

/**
 * Maps each InventoryState collection to its Postgres table. Every row is
 * stored as { id, owner_id, data } where `data` holds the full JSON object,
 * mirroring the in-memory shape so no per-field mapping is needed.
 */
const TABLES = {
  products: "products",
  suppliers: "suppliers",
  locations: "locations",
  purchaseOrders: "purchase_orders",
  transfers: "transfers",
  stocktakes: "stocktakes",
  movements: "movements",
  reservations: "reservations",
} as const;

type Collection = keyof typeof TABLES;
const COLLECTIONS = Object.keys(TABLES) as Collection[];

/** Reads the seller's full workspace. Returns null if they have no data yet. */
export async function loadWorkspace(
  supabase: SupabaseClient,
  ownerId: string,
): Promise<InventoryState | null> {
  const results = await Promise.all(
    COLLECTIONS.map((c) =>
      supabase.from(TABLES[c]).select("data").eq("owner_id", ownerId),
    ),
  );

  let total = 0;
  const state = {} as Record<Collection, unknown[]>;
  COLLECTIONS.forEach((c, i) => {
    const { data, error } = results[i];
    if (error) throw error;
    const rows = (data ?? []).map((r: { data: unknown }) => r.data);
    state[c] = rows;
    total += rows.length;
  });

  if (total === 0) return null;
  return state as unknown as InventoryState;
}

/** Upserts all rows for one collection, then deletes rows no longer present. */
async function syncCollection(
  supabase: SupabaseClient,
  ownerId: string,
  collection: Collection,
  items: { id: string }[],
) {
  const table = TABLES[collection];
  const rows = items.map((item) => ({ id: item.id, owner_id: ownerId, data: item }));

  if (rows.length > 0) {
    const { error } = await supabase.from(table).upsert(rows, { onConflict: "owner_id,id" });
    if (error) throw error;
  }

  const keepIds = items.map((i) => i.id);
  let del = supabase.from(table).delete().eq("owner_id", ownerId);
  if (keepIds.length > 0) {
    del = del.not("id", "in", `(${keepIds.map((id) => `"${id}"`).join(",")})`);
  }
  const { error } = await del;
  if (error) throw error;
}

/** Persists the entire workspace. Called debounced from the provider. */
export async function saveWorkspace(
  supabase: SupabaseClient,
  ownerId: string,
  state: InventoryState,
): Promise<void> {
  await Promise.all(
    COLLECTIONS.map((c) =>
      syncCollection(supabase, ownerId, c, state[c] as { id: string }[]),
    ),
  );
}
