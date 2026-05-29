import type { Order, ProductReturn } from "@/mock/inventory";

/**
 * Analytics metric catalogue. Each metric carries the human description and the
 * formula shown in the hover card (Shopify-style), plus the dashboard derives
 * its values from the workspace orders. Web-only metrics (sessions, conversion)
 * have no source in this app and report 0 / "no data", matching the empty
 * state in the reference design.
 */

export interface MetricDef {
  key: string;
  title: string;
  description: string;
  /** Optional formula, rendered in monospace under the description. */
  formula?: string;
}

export const METRICS: Record<string, MetricDef> = {
  grossSales: {
    key: "grossSales",
    title: "Gross sales",
    description: "Sales before discounts, returns, taxes, and shipping.",
    formula: "Gross sales = product price × quantity ordered",
  },
  returningCustomerRate: {
    key: "returningCustomerRate",
    title: "Returning customer rate",
    description: "Percentage of customers who have placed more than one order.",
    formula: "Returning customer rate = returning customers / total customers",
  },
  ordersFulfilled: {
    key: "ordersFulfilled",
    title: "Orders fulfilled",
    description: "Number of orders that have been fully fulfilled.",
  },
  orders: {
    key: "orders",
    title: "Orders",
    description: "Number of orders placed during the selected period.",
  },
  totalSales: {
    key: "totalSales",
    title: "Total sales over time",
    description: "Total sales, factoring in discounts, returns, shipping, and taxes.",
    formula: "Total sales = gross sales − discounts − returns + shipping + taxes",
  },
  discounts: {
    key: "discounts",
    title: "Discounts",
    description: "Total value of discounts applied to orders.",
  },
  returns: {
    key: "returns",
    title: "Returns",
    description: "Total value of items returned by customers.",
  },
  netSales: {
    key: "netSales",
    title: "Net sales",
    description: "Sales after discounts and returns, before shipping and taxes.",
    formula: "Net sales = gross sales − discounts − returns",
  },
  shippingCharges: {
    key: "shippingCharges",
    title: "Shipping charges",
    description: "Total shipping charged to customers.",
  },
  returnFees: {
    key: "returnFees",
    title: "Return fees",
    description: "Fees charged on returned orders.",
  },
  taxes: {
    key: "taxes",
    title: "Taxes",
    description: "Total tax collected on orders.",
  },
  salesByChannel: {
    key: "salesByChannel",
    title: "Total sales by sales channel",
    description: "Total sales broken down by the channel the order came from.",
  },
  averageOrderValue: {
    key: "averageOrderValue",
    title: "Average order value over time",
    description: "Average order value, factoring in discounts",
    formula: "Average order value = (gross sales − discounts) / orders",
  },
  salesByProduct: {
    key: "salesByProduct",
    title: "Total sales by product",
    description: "Total sales broken down by product.",
  },
  sessions: {
    key: "sessions",
    title: "Sessions over time",
    description: "Number of sessions on your online store.",
  },
  conversionRate: {
    key: "conversionRate",
    title: "Conversion rate over time",
    description: "Percentage of sessions that resulted in a completed order.",
    formula: "Conversion rate = orders / sessions × 100",
  },
  conversionBreakdown: {
    key: "conversionBreakdown",
    title: "Conversion rate breakdown",
    description: "Funnel from sessions through to completed checkouts.",
  },
};

// ── Computation ──────────────────────────────────────────────────────────────

export interface SalesTotals {
  grossSales: number;
  discounts: number;
  returns: number;
  netSales: number;
  shippingCharges: number;
  returnFees: number;
  taxes: number;
  totalSales: number;
  orders: number;
  ordersFulfilled: number;
  averageOrderValue: number;
  returningCustomerRate: number;
}

const FULFILLED_STATUSES = new Set(["shipped", "delivered"]);

function inRange(iso: string, start: Date, end: Date): boolean {
  const t = new Date(iso).getTime();
  return t >= start.getTime() && t <= end.getTime();
}

/** Aggregate sales totals for orders within [start, end]. */
export function computeSalesTotals(
  orders: Order[],
  returns: ProductReturn[],
  start: Date,
  end: Date,
): SalesTotals {
  const scoped = orders.filter((o) => inRange(o.createdAt, start, end) && o.status !== "cancelled");

  let grossSales = 0;
  let discounts = 0;
  let shippingCharges = 0;
  let ordersFulfilled = 0;
  const customerOrderCounts = new Map<string, number>();

  for (const o of scoped) {
    const lineGross = o.items.reduce((s, it) => s + it.unitPrice * it.qty, 0);
    grossSales += lineGross;
    // Discount = the gap between line gross and recorded revenue, if any.
    discounts += Math.max(0, lineGross - o.revenue);
    shippingCharges += o.logisticsCost ?? 0;
    if (FULFILLED_STATUSES.has(o.status)) ordersFulfilled++;
    const cust = o.customerId ?? o.customerName;
    if (cust) customerOrderCounts.set(cust, (customerOrderCounts.get(cust) ?? 0) + 1);
  }

  const returnsValue = returns
    .filter((r) => inRange(r.createdAt, start, end))
    .reduce((s, r) => s + (r.totalValue ?? 0), 0);

  const ordersCount = scoped.length;
  const netSales = grossSales - discounts - returnsValue;
  const taxes = 0;
  const returnFees = 0;
  const totalSales = netSales + shippingCharges + taxes;
  const averageOrderValue = ordersCount > 0 ? (grossSales - discounts) / ordersCount : 0;

  const totalCustomers = customerOrderCounts.size;
  const returningCustomers = [...customerOrderCounts.values()].filter((n) => n > 1).length;
  const returningCustomerRate = totalCustomers > 0 ? (returningCustomers / totalCustomers) * 100 : 0;

  return {
    grossSales,
    discounts,
    returns: returnsValue,
    netSales,
    shippingCharges,
    returnFees,
    taxes,
    totalSales,
    orders: ordersCount,
    ordersFulfilled,
    averageOrderValue,
    returningCustomerRate,
  };
}

export interface TimePoint {
  /** Bucket label, e.g. "12 AM" or "May 28". */
  label: string;
  value: number;
}

/** Bucket order revenue over time: by hour for a single day, else by day. */
export function salesOverTime(orders: Order[], start: Date, end: Date): TimePoint[] {
  const scoped = orders.filter((o) => inRange(o.createdAt, start, end) && o.status !== "cancelled");
  const sameDay = end.getTime() - start.getTime() <= 24 * 3600 * 1000;

  if (sameDay) {
    const buckets = Array.from({ length: 24 }, (_, h) => ({ h, value: 0 }));
    for (const o of scoped) {
      const h = new Date(o.createdAt).getHours();
      buckets[h].value += o.revenue;
    }
    return buckets
      .filter((_, h) => h % 2 === 0)
      .map((b) => ({ label: hourLabel(b.h), value: b.value }));
  }

  const byDay = new Map<string, number>();
  for (const o of scoped) {
    const d = new Date(o.createdAt);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    byDay.set(key, (byDay.get(key) ?? 0) + o.revenue);
  }
  const out: TimePoint[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const key = `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`;
    out.push({
      label: cursor.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: byDay.get(key) ?? 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

function hourLabel(h: number): string {
  if (h === 0) return "12 AM";
  if (h === 12) return "12 PM";
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

export interface Breakdown {
  label: string;
  value: number;
}

export function salesByChannel(orders: Order[], start: Date, end: Date): Breakdown[] {
  const scoped = orders.filter((o) => inRange(o.createdAt, start, end) && o.status !== "cancelled");
  const map = new Map<string, number>();
  for (const o of scoped) map.set(o.channel, (map.get(o.channel) ?? 0) + o.revenue);
  return [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

export function salesByProduct(orders: Order[], start: Date, end: Date, limit = 5): Breakdown[] {
  const scoped = orders.filter((o) => inRange(o.createdAt, start, end) && o.status !== "cancelled");
  const map = new Map<string, number>();
  for (const o of scoped) {
    for (const it of o.items) {
      map.set(it.productName, (map.get(it.productName) ?? 0) + it.unitPrice * it.qty);
    }
  }
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}
