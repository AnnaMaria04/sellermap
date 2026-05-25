import {
  type AvailableToSellResult,
  type DemandSnapshot,
  type InventoryRecommendation,
  type InventorySnapshot,
  type MovementType,
  type NotificationChannel,
  type NotificationEvent,
  type ProductCard,
  type PurchaseOrderDraft,
  type PurchaseOrderLine,
  type ReceivingLine,
  type StockMovement,
  calculateAvailableToSell,
} from "./foundation";

export interface InventoryStore {
  products: ProductCard[];
  snapshots: InventorySnapshot[];
  purchaseOrders: PurchaseOrderDraft[];
  movements: StockMovement[];
  recommendations: InventoryRecommendation[];
  notifications: NotificationEvent[];
}

export interface StockAvailabilityView {
  snapshot: InventorySnapshot;
  availability: AvailableToSellResult;
}

export function getProductAvailability(store: InventoryStore, productId: string): StockAvailabilityView[] {
  return store.snapshots
    .filter((snapshot) => snapshot.productId === productId)
    .map((snapshot) => ({
      snapshot,
      availability: calculateAvailableToSell(snapshot.status),
    }));
}

export function createPurchaseOrderDraft(input: {
  id: string;
  supplierId: string;
  lines: PurchaseOrderLine[];
  expectedArrivalDate?: string;
}): PurchaseOrderDraft {
  const draft: PurchaseOrderDraft = {
    id: input.id,
    supplierId: input.supplierId,
    status: "draft",
    lines: input.lines.map((line) => ({ ...line, quantityReceived: line.quantityReceived ?? 0 })),
  };

  if (input.expectedArrivalDate !== undefined) {
    draft.expectedArrivalDate = input.expectedArrivalDate;
  }

  return draft;
}

export function receivePurchaseOrder(
  order: PurchaseOrderDraft,
  receivingLines: ReceivingLine[],
): PurchaseOrderDraft {
  const receivedByKey = new Map<string, number>();

  for (const line of receivingLines) {
    receivedByKey.set(lineKey(line.productId, line.variantId), line.received);
  }

  const lines = order.lines.map((line) => {
    const received = receivedByKey.get(lineKey(line.productId, line.variantId)) ?? 0;
    return {
      ...line,
      quantityReceived: line.quantityReceived + received,
    };
  });

  const allReceived = lines.every((line) => line.quantityReceived >= line.quantityOrdered);
  const anyReceived = lines.some((line) => line.quantityReceived > 0);
  const hasProblem = receivingLines.some(
    (line) => line.damaged > 0 || line.missing > 0 || line.extra > 0 || Boolean(line.problemNote),
  );

  return {
    ...order,
    lines,
    status: hasProblem ? "problem" : allReceived ? "closed" : anyReceived ? "partially_received" : order.status,
  };
}

export function createStockMovement(input: {
  id: string;
  type: MovementType;
  productId: string;
  variantId?: string;
  fromLocationId?: string;
  toLocationId?: string;
  quantityDelta: number;
  beforeQuantity: number;
  reason?: string;
  relatedDocumentId?: string;
  actorId: string;
  occurredAt: string;
}): StockMovement {
  return {
    ...input,
    afterQuantity: input.beforeQuantity + input.quantityDelta,
  };
}

export function recommendReorder(input: {
  id: string;
  productId: string;
  variantId?: string;
  availability: AvailableToSellResult;
  demand: DemandSnapshot;
  supplierLeadTimeDays: number;
}): InventoryRecommendation | undefined {
  const daysUntilStockout =
    input.demand.daysUntilStockout ??
    (input.demand.averageDailySales > 0
      ? input.availability.availableToSell / input.demand.averageDailySales
      : undefined);

  if (daysUntilStockout === undefined || daysUntilStockout > input.supplierLeadTimeDays + 2) {
    return undefined;
  }

  const suggestedQuantity = Math.ceil(input.demand.averageDailySales * (input.supplierLeadTimeDays + 14));

  const recommendation: InventoryRecommendation = {
    id: input.id,
    productId: input.productId,
    action: "order_now",
    priority: daysUntilStockout <= input.supplierLeadTimeDays ? "high" : "medium",
    reason: `Projected stockout in ${Math.ceil(daysUntilStockout)} day(s), supplier lead time is ${input.supplierLeadTimeDays} day(s).`,
    suggestedQuantity,
  };

  if (input.variantId !== undefined) {
    recommendation.variantId = input.variantId;
  }

  return recommendation;
}

export function buildNotificationFromRecommendation(input: {
  id: string;
  recommendation: InventoryRecommendation;
  channels?: NotificationChannel[];
  createdAt: string;
}): NotificationEvent {
  return {
    id: input.id,
    type: input.recommendation.action === "order_now" ? "reorder_due" : "low_stock",
    channels: input.channels ?? ["dashboard"],
    productId: input.recommendation.productId,
    message: input.recommendation.reason,
    createdAt: input.createdAt,
  };
}

function lineKey(productId: string, variantId?: string): string {
  return `${productId}:${variantId ?? "default"}`;
}
