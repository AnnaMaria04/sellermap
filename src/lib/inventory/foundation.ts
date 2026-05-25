export type BusinessType =
  | "retail_store"
  | "online_offline"
  | "coffee_shop"
  | "small_production"
  | "marketplace_seller";

export type SalesChannel =
  | "pos"
  | "website"
  | "telegram"
  | "instagram"
  | "delivery"
  | "wildberries"
  | "ozon"
  | "yandex_market";

export type LocationKind =
  | "warehouse"
  | "store"
  | "showroom"
  | "backroom"
  | "online_reserve"
  | "damaged"
  | "returns"
  | "in_transit"
  | "marketplace_allocation";

export type AccountingType =
  | "product"
  | "ingredient"
  | "bundle"
  | "recipe"
  | "consumable"
  | "packaging";

export type ProductType =
  | "simple"
  | "variant_parent"
  | "variant"
  | "kit"
  | "recipe";

export type ImportSource =
  | "csv"
  | "excel"
  | "shopify"
  | "one_c"
  | "moysklad"
  | "pos"
  | "supplier";

export type ExportTarget =
  | "products"
  | "inventory"
  | "movements"
  | "suppliers"
  | "purchase_orders"
  | "marking"
  | "analytics"
  | "accountant_report";

export type PurchaseOrderStatus =
  | "draft"
  | "sent"
  | "confirmed"
  | "in_transit"
  | "partially_received"
  | "closed"
  | "problem";

export type MarkingCodeStatus =
  | "not_required"
  | "required"
  | "pending"
  | "verified"
  | "blocked"
  | "error";

export type MovementType =
  | "receipt"
  | "sale"
  | "reserve"
  | "release_reserve"
  | "return"
  | "write_off"
  | "transfer"
  | "adjustment"
  | "stocktake"
  | "marking"
  | "purchase_price_change";

export type RecommendationAction =
  | "order_now"
  | "do_not_reorder"
  | "discount"
  | "transfer"
  | "raise_price"
  | "check_supplier"
  | "check_marking"
  | "run_stocktake"
  | "replace_supplier"
  | "decrease_purchase"
  | "increase_purchase";

export type NotificationChannel = "dashboard" | "telegram" | "email";

export type NotificationEventType =
  | "low_stock"
  | "expiring_soon"
  | "supplier_price_increased"
  | "margin_dropped"
  | "stock_discrepancy"
  | "dead_stock"
  | "partial_supplier_delivery"
  | "marking_problem"
  | "stocktake_due"
  | "reorder_due";

export interface OnboardingProfile {
  businessType: BusinessType;
  salesChannels: SalesChannel[];
  locations: InventoryLocation[];
}

export interface InventoryLocation {
  id: string;
  name: string;
  kind: LocationKind;
  salesChannels?: SalesChannel[];
}

export interface Supplier {
  id: string;
  name: string;
  leadTimeDays?: number;
  minimumOrderQuantity?: number;
  currentPurchasePrice?: number;
  previousPurchasePrice?: number;
  catalogConnected?: boolean;
}

export interface ProductVariant {
  id: string;
  sku: string;
  barcode?: string;
  attributes: Record<string, string>;
  salePrice?: number;
  purchasePrice?: number;
}

export interface ChannelPlacement {
  channel: SalesChannel;
  isActive: boolean;
  commissionRate?: number;
  deliveryCost?: number;
  marketplaceAllocation?: number;
}

export interface LabelProfile {
  barcode?: string;
  qrCode?: string;
  labelType?: "price_tag" | "barcode" | "shelf" | "batch" | "warehouse" | "data_matrix";
}

export interface MarkingProfile {
  required: boolean;
  system?: "chestny_znak";
  gtin?: string;
  dataMatrix?: string;
  batch?: string;
  expiresAt?: string;
  status: MarkingCodeStatus;
  error?: string;
}

export interface ProductCard {
  id: string;
  name: string;
  description?: string;
  category?: string;
  type: ProductType;
  accountingType: AccountingType;
  sku: string;
  barcode?: string;
  photoUrl?: string;
  variants: ProductVariant[];
  channels: ChannelPlacement[];
  supplierId?: string;
  salePrice?: number;
  purchasePrice?: number;
  packagingCost?: number;
  marking?: MarkingProfile;
  labels?: LabelProfile[];
  components?: ProductComponent[];
}

export interface ProductComponent {
  productId: string;
  variantId?: string;
  quantity: number;
}

export interface StockStatusMap {
  physical: number;
  reserved: number;
  warehouse: number;
  showroom: number;
  store: number;
  inTransit: number;
  damaged: number;
  returns: number;
  expired: number;
  marketplaceAllocated: number;
}

export interface InventorySnapshot {
  productId: string;
  variantId?: string;
  locationId?: string;
  status: StockStatusMap;
  updatedAt: string;
}

export interface AvailableToSellResult {
  availableToSell: number;
  rawAvailableToSell: number;
  warnings: string[];
}

export interface ImportJob {
  id: string;
  source: ImportSource;
  status: "draft" | "mapping" | "validating" | "ready" | "imported" | "failed";
  fileName?: string;
  columnMap?: Record<string, string>;
  errors: ImportJobError[];
  creates: ExportTarget[];
}

export interface ImportJobError {
  row?: number;
  field?: string;
  message: string;
}

export interface ExportJob {
  id: string;
  targets: ExportTarget[];
  status: "draft" | "queued" | "ready" | "failed";
  format: "csv" | "xlsx" | "json";
}

export interface PurchaseOrderDraft {
  id: string;
  supplierId: string;
  status: PurchaseOrderStatus;
  expectedArrivalDate?: string;
  lines: PurchaseOrderLine[];
}

export interface PurchaseOrderLine {
  productId: string;
  variantId?: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitPurchasePrice: number;
  previousPurchasePrice?: number;
  minimumOrderQuantity?: number;
}

export interface ReceivingLine {
  productId: string;
  variantId?: string;
  ordered: number;
  received: number;
  damaged: number;
  missing: number;
  extra: number;
  expiresAt?: string;
  markingStatus?: MarkingCodeStatus;
  problemNote?: string;
  photoUrls?: string[];
}

export interface StockMovement {
  id: string;
  type: MovementType;
  productId: string;
  variantId?: string;
  fromLocationId?: string;
  toLocationId?: string;
  quantityDelta: number;
  beforeQuantity: number;
  afterQuantity: number;
  reason?: string;
  relatedDocumentId?: string;
  actorId: string;
  occurredAt: string;
}

export interface DemandSnapshot {
  productId: string;
  variantId?: string;
  averageDailySales: number;
  averageWeeklySales: number;
  averageMonthlySales: number;
  daysUntilStockout?: number;
  seasonalityIndex?: number;
  inventoryValue?: number;
  margin?: number;
}

export interface InventoryRecommendation {
  id: string;
  action: RecommendationAction;
  productId: string;
  variantId?: string;
  priority: "low" | "medium" | "high";
  reason: string;
  suggestedQuantity?: number;
}

export interface NotificationEvent {
  id: string;
  type: NotificationEventType;
  channels: NotificationChannel[];
  productId?: string;
  supplierId?: string;
  message: string;
  createdAt: string;
}

export interface AsyncCheckEnrichmentPlan {
  mode: "draft_first";
  draftResponseDeadlineMs: number;
  workerTopics: Array<
    | "supplier_enrichment"
    | "barcode_lookup"
    | "marketplace_mapping"
    | "marking_validation"
    | "recommendation_refresh"
  >;
}

export const inventoryFlowChecklist = [
  "onboard_business_profile",
  "configure_sales_channels",
  "create_or_import_products",
  "attach_barcodes_labels_and_marking",
  "load_location_stock_statuses",
  "connect_suppliers_and_purchase_orders",
  "receive_transfer_stocktake_write_off_returns",
  "record_movement_history",
  "calculate_analytics_forecasts_recommendations_alerts",
] as const;

export function calculateAvailableToSell(status: StockStatusMap): AvailableToSellResult {
  const rawAvailableToSell =
    status.physical -
    status.reserved -
    status.damaged -
    status.expired -
    status.inTransit;

  const warnings: string[] = [];

  if (rawAvailableToSell < 0) {
    warnings.push("Raw available-to-sell is negative; check reservations, damaged, expired, and in-transit quantities.");
  }

  if (status.physical < status.reserved) {
    warnings.push("Reserved quantity is greater than physical stock.");
  }

  return {
    availableToSell: Math.max(0, rawAvailableToSell),
    rawAvailableToSell,
    warnings,
  };
}

export function createInitialStockStatus(overrides: Partial<StockStatusMap> = {}): StockStatusMap {
  return {
    physical: 0,
    reserved: 0,
    warehouse: 0,
    showroom: 0,
    store: 0,
    inTransit: 0,
    damaged: 0,
    returns: 0,
    expired: 0,
    marketplaceAllocated: 0,
    ...overrides,
  };
}
