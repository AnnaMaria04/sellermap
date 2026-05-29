import {
  type Product,
  type StockMovement,
  getAvailableStock,
} from "@/mock/inventory";

// Reference "today" for the demo dataset (mock movements are dated up to late
// May 2026). Using a fixed anchor keeps computed metrics deterministic.
const TODAY = new Date();

function daysBetween(a: Date, b: Date): number {
  return Math.max(0, Math.round((a.getTime() - b.getTime()) / 86_400_000));
}

export type ABCClass = "A" | "B" | "C";

export interface ProductMetrics {
  product: Product;
  unitsSold: number;            // over the window
  salesVelocity: number;        // units / day
  daysOfInventory: number;      // available / velocity (Infinity if no sales)
  turnoverRatio: number;        // annualized COGS / avg inventory value (approx)
  sellThroughRate: number;      // sold / (sold + onHand), 0..1
  inventoryValue: number;       // onHand * costPrice
  lastSaleDaysAgo: number | null;
  isDeadStock: boolean;
  abcClass: ABCClass;
}

export interface AnalyticsSummary {
  windowDays: number;
  totalInventoryValue: number;
  avgTurnover: number;
  deadStockCount: number;
  deadStockValue: number;
  abcCounts: Record<ABCClass, number>;
  abcValue: Record<ABCClass, number>;
  avgSellThrough: number;
}

interface ComputeOptions {
  windowDays?: number;       // sales window for velocity (default 30)
  deadStockDays?: number;    // no-sale threshold for dead stock (default 60)
}

/**
 * Per-product analytics derived from live products + movement history.
 * "Sales" = movements of type "sale" (qtyDelta is negative); units sold is the
 * absolute delta summed across the window.
 */
export function computeProductMetrics(
  products: Product[],
  movements: StockMovement[],
  options: ComputeOptions = {},
): ProductMetrics[] {
  const windowDays = options.windowDays ?? 30;
  const deadStockDays = options.deadStockDays ?? 60;
  const windowStart = new Date(TODAY.getTime() - windowDays * 86_400_000);

  const active = products.filter((p) => p.status === "active");

  // Aggregate sale movements per product.
  const soldInWindow = new Map<string, number>();
  const lastSale = new Map<string, Date>();
  for (const m of movements) {
    if (m.type !== "sale") continue;
    const when = new Date(m.createdAt);
    const units = Math.abs(m.qtyDelta);
    if (when >= windowStart) {
      soldInWindow.set(m.productId, (soldInWindow.get(m.productId) ?? 0) + units);
    }
    const prev = lastSale.get(m.productId);
    if (!prev || when > prev) lastSale.set(m.productId, when);
  }

  // First pass: raw metrics + inventory value (needed for ABC ranking).
  const base = active.map((product) => {
    const onHand = product.totalPhysical;
    const available = getAvailableStock(product);
    const unitsSold = soldInWindow.get(product.id) ?? 0;
    const salesVelocity = unitsSold / windowDays;
    const daysOfInventory = salesVelocity > 0 ? available / salesVelocity : Infinity;
    const inventoryValue = onHand * product.costPrice;

    // Annualized turnover ≈ (units sold / window * 365 * cost) / inventory value.
    const annualCogs = salesVelocity * 365 * product.costPrice;
    const turnoverRatio = inventoryValue > 0 ? annualCogs / inventoryValue : 0;

    const sellThroughDen = unitsSold + onHand;
    const sellThroughRate = sellThroughDen > 0 ? unitsSold / sellThroughDen : 0;

    const last = lastSale.get(product.id) ?? null;
    const lastSaleDaysAgo = last ? daysBetween(TODAY, last) : null;
    const isDeadStock = onHand > 0 && (lastSaleDaysAgo === null || lastSaleDaysAgo >= deadStockDays);

    return {
      product,
      unitsSold,
      salesVelocity,
      daysOfInventory,
      turnoverRatio,
      sellThroughRate,
      inventoryValue,
      lastSaleDaysAgo,
      isDeadStock,
    };
  });

  // ABC classification by cumulative share of total inventory value (Pareto):
  // A = top 80% of value, B = next 15%, C = last 5%.
  const totalValue = base.reduce((s, m) => s + m.inventoryValue, 0);
  const ranked = [...base].sort((a, b) => b.inventoryValue - a.inventoryValue);
  const abcById = new Map<string, ABCClass>();
  let cumulative = 0;
  for (const m of ranked) {
    const share = totalValue > 0 ? m.inventoryValue / totalValue : 0;
    cumulative += share;
    const cls: ABCClass = cumulative <= 0.8 ? "A" : cumulative <= 0.95 ? "B" : "C";
    abcById.set(m.product.id, cls);
  }

  return base.map((m) => ({ ...m, abcClass: abcById.get(m.product.id) ?? "C" }));
}

export function summarizeAnalytics(metrics: ProductMetrics[], windowDays = 30): AnalyticsSummary {
  const abcCounts: Record<ABCClass, number> = { A: 0, B: 0, C: 0 };
  const abcValue: Record<ABCClass, number> = { A: 0, B: 0, C: 0 };
  let totalInventoryValue = 0;
  let turnoverSum = 0;
  let turnoverCount = 0;
  let deadStockCount = 0;
  let deadStockValue = 0;
  let sellThroughSum = 0;

  for (const m of metrics) {
    totalInventoryValue += m.inventoryValue;
    abcCounts[m.abcClass] += 1;
    abcValue[m.abcClass] += m.inventoryValue;
    if (m.turnoverRatio > 0) { turnoverSum += m.turnoverRatio; turnoverCount += 1; }
    if (m.isDeadStock) { deadStockCount += 1; deadStockValue += m.inventoryValue; }
    sellThroughSum += m.sellThroughRate;
  }

  return {
    windowDays,
    totalInventoryValue,
    avgTurnover: turnoverCount > 0 ? turnoverSum / turnoverCount : 0,
    deadStockCount,
    deadStockValue,
    abcCounts,
    abcValue,
    avgSellThrough: metrics.length > 0 ? sellThroughSum / metrics.length : 0,
  };
}
