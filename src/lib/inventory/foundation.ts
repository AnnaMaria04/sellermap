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
  shelfUnits?: number;
  storeUnits?: number;
  returnUnits?: number;
  allocatedMarketplaceUnits?: number;
}

export interface InventoryAvailability {
  availableToSell: number;
  availableToSellRaw: number;
  statusMap: Record<InventoryStatus, number>;
  warnings: string[];
}

export interface ProductVariant {
  sku: string;
  barcode?: string;
  options: Record<string, string>;
  salePrice: number;
  costPrice: number;
}

export type ProductAccountingType =
  | "product"
  | "ingredient"
  | "bundle"
  | "recipe"
  | "consumable"
  | "packaging";

export type LabelType =
  | "price"
  | "barcode"
  | "qr"
  | "warehouse"
  | "shelf"
  | "batch"
  | "data_matrix";

export interface ProductCardDraft {
  productName: string;
  sku: string;
  barcode?: string;
  accountingType: ProductAccountingType;
  channels: SalesChannel[];
  variants: ProductVariant[];
}

export type ImportSource = "excel" | "csv" | "shopify" | "1c" | "moy_sklad" | "pos" | "supplier";

export interface ImportJobDraft {
  source: ImportSource;
  filename: string;
  mappedColumns: Record<string, string>;
}

export type PurchaseOrderStatus =
  | "draft"
  | "sent"
  | "confirmed"
  | "in_transit"
  | "partially_received"
  | "closed"
  | "issue";

export interface PurchaseOrderLine {
  sku: string;
  orderedUnits: number;
  receivedUnits: number;
  costPrice: number;
  moq?: number;
}

export interface PurchaseOrderDraft {
  supplierId: string;
  expectedAt?: string;
  status: PurchaseOrderStatus;
  lines: PurchaseOrderLine[];
}

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

export interface MovementRecord {
  type: MovementType;
  sku: string;
  unitsDelta: number;
  location: StockLocationType;
  actorId: string;
  reason?: string;
  documentId?: string;
  createdAt: string;
}

export interface DemandSnapshot {
  avgDailySales: number;
  daysOfStock: number;
  sellThroughRate: number;
}

export type InventoryRecommendationAction =
  | "order_now"
  | "do_not_reorder"
  | "liquidate"
  | "move_stock"
  | "raise_price"
  | "check_supplier"
  | "check_labeling"
  | "run_stocktake"
  | "replace_supplier"
  | "decrease_purchase"
  | "increase_purchase";

export interface InventoryRecommendation {
  action: InventoryRecommendationAction;
  severity: "low" | "medium" | "high";
  message: string;
}

export interface NotificationEvent {
  channel: "dashboard" | "telegram" | "email";
  topic:
    | "low_stock"
    | "expiring"
    | "supplier_price_up"
    | "margin_drop"
    | "stock_mismatch"
    | "stuck_stock"
    | "po_partial"
    | "labeling_issue"
    | "stocktake_due"
    | "reorder_due";
  message: string;
}

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

function sanitizeUnits(units: number): number {
  if (!Number.isFinite(units)) return 0;
  return Math.max(0, Math.floor(units));
}

/**
 * Available-to-sell formula:
 * physical - reserved - damaged - expired - in_transit
 *
 * We return both raw and clamped values so UI/analytics can display warnings
 * while downstream sales workflows always use non-negative availability.
 */
export function calculateAvailableToSell(snapshot: InventorySnapshot): InventoryAvailability {
  const physicalUnits = sanitizeUnits(snapshot.physicalUnits);
  const reservedUnits = sanitizeUnits(snapshot.reservedUnits);
  const damagedUnits = sanitizeUnits(snapshot.damagedUnits);
  const expiredUnits = sanitizeUnits(snapshot.expiredUnits);
  const inTransitUnits = sanitizeUnits(snapshot.inTransitUnits);
  const onShelfUnits = sanitizeUnits(snapshot.shelfUnits ?? 0);
  const inStoreUnits = sanitizeUnits(snapshot.storeUnits ?? 0);
  const returnUnits = sanitizeUnits(snapshot.returnUnits ?? 0);
  const allocatedMarketplaceUnits = sanitizeUnits(snapshot.allocatedMarketplaceUnits ?? 0);

  const availableToSellRaw =
    physicalUnits - reservedUnits - damagedUnits - expiredUnits - inTransitUnits;

  const warnings: string[] = [];
  if (availableToSellRaw < 0) {
    warnings.push("Available stock is negative. Check reservations, damaged, or in-transit allocations.");
  }

  return {
    availableToSell: Math.max(0, availableToSellRaw),
    availableToSellRaw,
    statusMap: {
      available: Math.max(0, availableToSellRaw),
      reserved: reservedUnits,
      on_hand: physicalUnits,
      on_shelf: onShelfUnits,
      in_store: inStoreUnits,
      in_transit: inTransitUnits,
      damaged: damagedUnits,
      returns: returnUnits,
      expired: expiredUnits,
      allocated_marketplace: allocatedMarketplaceUnits,
    },
    warnings,
  };
}

export interface CheckDraftContext {
  checkId: string;
  createdAt: string;
  productName: string;
  supplierUrl?: string;
  wbQuery?: string;
}

export interface EnrichmentTask {
  source: "supplier" | "wildberries";
  priority: "high" | "normal";
  dedupeKey: string;
}

/**
 * Cache-first workflow:
 * 1) create draft result immediately from /check
 * 2) queue enrichment tasks
 * 3) update persisted snapshot when async worker completes
 */
export function createEnrichmentPlan(context: CheckDraftContext): EnrichmentTask[] {
  const tasks: EnrichmentTask[] = [];

  if (context.supplierUrl) {
    tasks.push({
      source: "supplier",
      priority: "high",
      dedupeKey: `supplier:${context.supplierUrl}`,
    });
  }

  if (context.wbQuery || context.productName) {
    tasks.push({
      source: "wildberries",
      priority: "normal",
      dedupeKey: `wildberries:${context.wbQuery ?? context.productName}`,
    });
  }

  return tasks;
}

export function buildInventoryFlowChecklist(profile: SellerOnboardingProfile): string[] {
  const steps = [
    "onboarding.channels",
    "products.create_or_import",
    "barcodes_and_labeling",
    "stock_locations_and_statuses",
    "vendors_and_purchase_orders",
    "receiving_transfers_stocktake",
    "movement_history",
    "analytics_and_recommendations",
  ];

  if (profile.channels.includes("pos")) {
    steps.push("pos_sync");
  }

  return steps;
}
