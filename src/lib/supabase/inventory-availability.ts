import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

type DB = SupabaseClient<Database>;

/**
 * Database-backed available-to-sell. These read from the `inventory_levels`
 * projection (maintained by triggers off stock_movements / reservations /
 * transfers), so they are the single source of truth for sellable stock —
 * not the in-memory `Product.reservedUnits`/`totalPhysical` fields.
 *
 * available_to_sell = max(0, on_hand - reserved - damaged - in_transit)
 */

/** Available units for one variant at one location. */
export async function availableToSell(
  supabase: DB,
  variantId: string,
  locationId: string,
): Promise<number> {
  const { data, error } = await supabase.rpc("available_to_sell", {
    p_variant: variantId,
    p_location: locationId,
  });
  if (error) throw error;
  return data ?? 0;
}

/** Available units for a product across its variants, optionally one location. */
export async function productAvailableToSell(
  supabase: DB,
  productId: string,
  locationId?: string,
): Promise<number> {
  const { data, error } = await supabase.rpc("product_available_to_sell", {
    p_product: productId,
    ...(locationId ? { p_location: locationId } : {}),
  });
  if (error) throw error;
  return data ?? 0;
}

export interface InventoryLevelRow {
  variantId: string;
  locationId: string;
  onHand: number;
  reserved: number;
  damaged: number;
  inTransit: number;
  availableToSell: number;
}

/** Reads the relational inventory_levels projection for the shop. */
export async function loadInventoryLevels(
  supabase: DB,
  orgId: string,
): Promise<InventoryLevelRow[]> {
  const { data, error } = await supabase
    .from("inventory_levels")
    .select("variant_id, location_id, on_hand, reserved, damaged, in_transit")
    .eq("org_id", orgId);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    variantId: r.variant_id,
    locationId: r.location_id,
    onHand: r.on_hand,
    reserved: r.reserved,
    damaged: r.damaged,
    inTransit: r.in_transit,
    availableToSell: Math.max(0, r.on_hand - r.reserved - r.damaged - r.in_transit),
  }));
}
