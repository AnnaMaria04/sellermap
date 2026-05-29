import type {
  Product,
  ReplenishmentRule,
  StockMovement,
  Order,
} from "@/mock/inventory";

/**
 * Replenishment engine.
 *
 * The app kept replenishment rules but had no engine — reorders were a manual
 * action (audit D13). This module evaluates rules against current stock and
 * sales velocity and produces concrete reorder suggestions, which can be rolled
 * up into draft purchase orders per supplier.
 */

export interface SalesPoint {
  productId: string;
  qty: number;
  /** ISO date string. */
  date: string;
}

export interface ReplenishmentSuggestion {
  productId: string;
  productName: string;
  sku: string;
  ruleId: string;
  triggerType: ReplenishmentRule["triggerType"];
  /** Available-to-sell at evaluation time. */
  available: number;
  /** The threshold the rule tripped on (min stock / reorder point / days). */
  threshold: number;
  /** Average units sold per day over the lookback window. */
  dailyVelocity: number;
  /** Estimated days of stock remaining (Infinity when there are no sales). */
  daysOfStockRemaining: number;
  recommendedQty: number;
  supplierId?: string;
  supplierName?: string;
  reason: string;
}

export interface ReplenishmentInput {
  products: Product[];
  rules: ReplenishmentRule[];
  /** Historical sales used to derive velocity. */
  sales: SalesPoint[];
  /** Lookback window for the velocity calc, in days. Default 30. */
  velocityWindowDays?: number;
  now?: Date;
}

function availableOf(product: Product): number {
  return Math.max(
    0,
    product.totalPhysical - product.reservedUnits - product.damagedUnits,
  );
}

/** Average units sold per day for a product over the lookback window. */
export function dailyVelocity(
  productId: string,
  sales: SalesPoint[],
  windowDays: number,
  now: Date,
): number {
  if (windowDays <= 0) return 0;
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - windowDays);
  let units = 0;
  for (const s of sales) {
    if (s.productId !== productId) continue;
    const d = new Date(s.date);
    if (d >= cutoff && d <= now) units += Math.max(0, s.qty);
  }
  return units / windowDays;
}

/** Build sales points from stock movements of type "sale" (qtyDelta < 0). */
export function salesFromMovements(movements: StockMovement[]): SalesPoint[] {
  return movements
    .filter((m) => m.type === "sale" && m.qtyDelta < 0)
    .map((m) => ({ productId: m.productId, qty: Math.abs(m.qtyDelta), date: m.createdAt }));
}

/** Build sales points from orders' line items. */
export function salesFromOrders(orders: Order[]): SalesPoint[] {
  const points: SalesPoint[] = [];
  for (const o of orders) {
    if (o.status === "cancelled" || o.status === "returned") continue;
    for (const item of o.items ?? []) {
      points.push({ productId: item.productId, qty: item.qty, date: o.createdAt });
    }
  }
  return points;
}

function evaluateRule(
  rule: ReplenishmentRule,
  product: Product,
  sales: SalesPoint[],
  windowDays: number,
  now: Date,
): ReplenishmentSuggestion | null {
  if (!rule.isActive) return null;

  const available = availableOf(product);
  const velocity = dailyVelocity(product.id, sales, windowDays, now);
  const daysRemaining = velocity > 0 ? available / velocity : Infinity;

  let tripped = false;
  let threshold = 0;
  let recommendedQty = rule.reorderQty;
  let reason = "";

  switch (rule.triggerType) {
    case "min_stock": {
      threshold = rule.minStock ?? 0;
      tripped = available <= threshold;
      reason = `Остаток ${available} ≤ минимума ${threshold}`;
      break;
    }
    case "reorder_point": {
      // Reorder point = expected demand over (implicit) lead window; reuse
      // minStock as the configured reorder point.
      threshold = rule.minStock ?? 0;
      tripped = available <= threshold;
      reason = `Остаток ${available} достиг точки перезаказа ${threshold}`;
      break;
    }
    case "days_of_stock": {
      threshold = rule.daysOfStock ?? 0;
      tripped = daysRemaining <= threshold;
      // Order enough to cover the target horizon, net of what's on hand.
      const target = Math.ceil(velocity * threshold);
      recommendedQty = Math.max(rule.reorderQty, target - available);
      reason = velocity > 0
        ? `Запаса на ${daysRemaining === Infinity ? "∞" : daysRemaining.toFixed(1)} дн. ≤ цели ${threshold} дн.`
        : `Нет продаж за ${windowDays} дн.`;
      break;
    }
  }

  if (!tripped || recommendedQty <= 0) return null;

  return {
    productId: product.id,
    productName: product.name,
    sku: product.sku,
    ruleId: rule.id,
    triggerType: rule.triggerType,
    available,
    threshold,
    dailyVelocity: Math.round(velocity * 100) / 100,
    daysOfStockRemaining: daysRemaining === Infinity ? Infinity : Math.round(daysRemaining * 10) / 10,
    recommendedQty,
    supplierId: rule.supplierId ?? product.supplierId,
    supplierName: rule.supplierName,
    reason,
  };
}

/** Evaluate all active rules and return the suggestions that tripped. */
export function computeReplenishment(input: ReplenishmentInput): ReplenishmentSuggestion[] {
  const { products, rules, sales } = input;
  const windowDays = input.velocityWindowDays ?? 30;
  const now = input.now ?? new Date();
  const byId = new Map(products.map((p) => [p.id, p]));

  const suggestions: ReplenishmentSuggestion[] = [];
  for (const rule of rules) {
    const product = byId.get(rule.productId);
    if (!product) continue;
    const s = evaluateRule(rule, product, sales, windowDays, now);
    if (s) suggestions.push(s);
  }
  // Most urgent first (fewest days of stock remaining).
  return suggestions.sort((a, b) => a.daysOfStockRemaining - b.daysOfStockRemaining);
}

export interface DraftPurchaseOrderLine {
  productId: string;
  productName: string;
  sku: string;
  qty: number;
  unitCost: number;
}

export interface DraftPurchaseOrder {
  supplierId?: string;
  supplierName?: string;
  lines: DraftPurchaseOrderLine[];
  totalQty: number;
  totalCost: number;
}

/** Roll suggestions up into one draft PO per supplier. */
export function suggestionsToDraftPOs(
  suggestions: ReplenishmentSuggestion[],
  products: Product[],
): DraftPurchaseOrder[] {
  const byId = new Map(products.map((p) => [p.id, p]));
  const groups = new Map<string, DraftPurchaseOrder>();

  for (const s of suggestions) {
    const key = s.supplierId ?? "__none__";
    let group = groups.get(key);
    if (!group) {
      group = { supplierId: s.supplierId, supplierName: s.supplierName, lines: [], totalQty: 0, totalCost: 0 };
      groups.set(key, group);
    }
    const unitCost = byId.get(s.productId)?.costPrice ?? 0;
    group.lines.push({ productId: s.productId, productName: s.productName, sku: s.sku, qty: s.recommendedQty, unitCost });
    group.totalQty += s.recommendedQty;
    group.totalCost += s.recommendedQty * unitCost;
  }

  return [...groups.values()];
}
