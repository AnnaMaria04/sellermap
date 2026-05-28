// Shared raw → Product mapping used by the IntegrationHub (interactive sync)
// and the scheduled cron route. Keeping a single source means add/edit-time
// changes (e.g. tagging conventions, channel-allocation defaults) apply both
// to manual and automatic syncs.
import type { Product, SalesChannel } from "@/mock/inventory";
import type { ChannelKind, RawExternalProduct } from "./types";

/** Map a marketplace channel kind to an internal SalesChannel where possible. */
export function channelForKind(kind: ChannelKind): SalesChannel[] {
  if (kind === "wildberries" || kind === "ozon" || kind === "yandex_market") return [kind];
  return [];
}

/** Build a minimal-but-valid Product from a pulled external product. */
export function toProduct(raw: RawExternalProduct, kind: ChannelKind): Product {
  const today = new Date().toISOString().split("T")[0];
  const stock = raw.stock ?? 0;
  const channels = channelForKind(kind);
  const channelAllocation = channels.length === 1 ? { [channels[0]]: 100 } : undefined;
  return {
    id: `imp-${kind}-${raw.externalId}`,
    name: raw.name,
    imageUrl: raw.imageUrl,
    category: raw.category?.trim() || "Без категории",
    productType: "product",
    status: "active",
    sku: raw.sku ?? raw.externalId,
    barcode: raw.barcode,
    hasVariants: false,
    variants: [],
    price: raw.price ?? 0,
    costPrice: 0,
    channels,
    channelAllocation,
    tags: ["импорт", kind],
    requiresLabeling: false,
    createdAt: today,
    updatedAt: today,
    stockByLocation: stock > 0 ? { "loc-main": stock } : {},
    reservedUnits: 0,
    damagedUnits: 0,
    inTransitUnits: 0,
    totalPhysical: stock,
  };
}
