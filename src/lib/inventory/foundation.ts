export type BusinessType = "retail" | "hybrid" | "cafe" | "small_production";

export type SalesChannel =
  | "pos"
  | "website"
  | "telegram"
  | "delivery"
  | "wildberries"
  | "ozon"
  | "yandex_market";

export type StockLocationType =
  | "warehouse"
  | "store"
  | "showroom"
  | "backroom"
  | "online_reserve"
  | "returns"
  | "damaged"
  | "in_transit";

export interface SellerOnboardingProfile {
  businessType: BusinessType;
  channels: SalesChannel[];
  locations: StockLocationType[];
}

export type InventoryStatus =
  | "available"
  | "reserved"
  | "on_hand"
  | "on_shelf"
  | "in_store"
  | "in_transit"
  | "damaged"
  | "returns"
  | "expired"
  | "allocated_marketplace";

export interface InventorySnapshot {
  physicalUnits: number;
  reservedUnits: number;
  damagedUnits: number;
  expiredUnits: number;
  inTransitUnits: number;
}

export interface InventoryAvailability {
  availableToSell: number;
  statusMap: Record<InventoryStatus, number>;
}

export type PurchaseOrderStatus =
  | "draft"
  | "sent"
  | "confirmed"
  | "in_transit"
  | "partially_received"
  | "closed"
  | "issue";

export type MovementType =
  | "receipt"
  | "sale"
  | "reserve"
  | "return"
  | "write_off"
  | "transfer"
  | "adjustment"
  | "stocktake"
  | "labeling"
  | "cost_change";

export function buildSellerModuleTabs(profile: SellerOnboardingProfile): string[] {
  const tabs = ["Marketplace Intelligence", "Inventory"];

  if (profile.channels.includes("pos")) {
    tabs.push("POS");
  }

  if (profile.businessType === "cafe" || profile.businessType === "small_production") {
    tabs.push("Recipes");
  }

  return tabs;
}

export function calculateAvailableToSell(snapshot: InventorySnapshot): InventoryAvailability {
  const availableToSell =
    snapshot.physicalUnits -
    snapshot.reservedUnits -
    snapshot.damagedUnits -
    snapshot.expiredUnits -
    snapshot.inTransitUnits;

  return {
    availableToSell,
    statusMap: {
      available: availableToSell,
      reserved: snapshot.reservedUnits,
      on_hand: snapshot.physicalUnits,
      on_shelf: 0,
      in_store: 0,
      in_transit: snapshot.inTransitUnits,
      damaged: snapshot.damagedUnits,
      returns: 0,
      expired: snapshot.expiredUnits,
      allocated_marketplace: 0,
    },
  };
}

export interface CheckDraftContext {
  checkId: string;
  createdAt: string;
  productName: string;
}

export interface EnrichmentTask {
  source: "supplier" | "wildberries";
  priority: "high" | "normal";
}

/**
 * Cache-first workflow:
 * 1) create draft result immediately from /check
 * 2) queue enrichment tasks
 * 3) update persisted snapshot when async worker completes
 */
export function createEnrichmentPlan(_context: CheckDraftContext): EnrichmentTask[] {
  return [
    { source: "supplier", priority: "high" },
    { source: "wildberries", priority: "normal" },
  ];
}
