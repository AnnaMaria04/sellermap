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
    title: "Валовые продажи",
    description: "Продажи до вычета скидок, возвратов, налогов и доставки.",
    formula: "Валовые продажи = цена товара × количество заказанного",
  },
  returningCustomerRate: {
    key: "returningCustomerRate",
    title: "Доля повторных клиентов",
    description: "Процент клиентов, оформивших более одного заказа.",
    formula: "Доля повторных клиентов = повторные клиенты / все клиенты",
  },
  ordersFulfilled: {
    key: "ordersFulfilled",
    title: "Заказы выполнены",
    description: "Количество полностью выполненных заказов.",
  },
  orders: {
    key: "orders",
    title: "Заказы",
    description: "Количество заказов за выбранный период.",
  },
  itemsOrdered: {
    key: "itemsOrdered",
    title: "Товаров заказано",
    description: "Количество заказанных товаров, без учёта отменённого количества.",
  },
  ordersDelivered: {
    key: "ordersDelivered",
    title: "Заказы доставлены",
    description: "Количество доставленных заказов.",
  },
  orderToFulfillment: {
    key: "orderToFulfillment",
    title: "Время до выполнения",
    description: "Среднее время от оформления заказа до его выполнения.",
  },
  totalSales: {
    key: "totalSales",
    title: "Итоговые продажи",
    description: "Итоговые продажи с учётом скидок, возвратов, доставки и налогов.",
    formula: "Итоговые продажи = валовые продажи − скидки − возвраты + доставка + налоги",
  },
  discounts: {
    key: "discounts",
    title: "Скидки",
    description: "Общая сумма скидок, применённых к заказам.",
  },
  returns: {
    key: "returns",
    title: "Возвраты",
    description: "Общая стоимость возвращённых клиентами товаров.",
  },
  netSales: {
    key: "netSales",
    title: "Чистые продажи",
    description: "Продажи после скидок и возвратов, до доставки и налогов.",
    formula: "Чистые продажи = валовые продажи − скидки − возвраты",
  },
  shippingCharges: {
    key: "shippingCharges",
    title: "Доставка",
    description: "Общая сумма доставки, выставленная клиентам.",
  },
  returnFees: {
    key: "returnFees",
    title: "Сборы за возврат",
    description: "Сборы, начисленные по возвращённым заказам.",
  },
  taxes: {
    key: "taxes",
    title: "Налоги",
    description: "Общая сумма налогов по заказам.",
  },
  salesByChannel: {
    key: "salesByChannel",
    title: "Продажи по каналам",
    description: "Итоговые продажи в разрезе канала, из которого пришёл заказ.",
  },
  averageOrderValue: {
    key: "averageOrderValue",
    title: "Средний чек",
    description: "Средняя стоимость заказа с учётом скидок",
    formula: "Средний чек = (валовые продажи − скидки) / заказы",
  },
  salesByProduct: {
    key: "salesByProduct",
    title: "Продажи по товарам",
    description: "Итоговые продажи в разрезе товаров.",
  },
  sessions: {
    key: "sessions",
    title: "Сеансы",
    description: "Количество сеансов в вашем интернет-магазине.",
  },
  conversionRate: {
    key: "conversionRate",
    title: "Конверсия",
    description: "Процент сеансов, завершившихся оформленным заказом.",
    formula: "Конверсия = заказы / сеансы × 100",
  },
  conversionBreakdown: {
    key: "conversionBreakdown",
    title: "Воронка конверсии",
    description: "Путь от сеансов до завершённых оформлений.",
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

export interface OrderStats {
  orders: number;
  itemsOrdered: number;
  returnsValue: number;
  ordersFulfilled: number;
  ordersDelivered: number;
  /** Average order→fulfillment time in hours, or null when unknown. */
  fulfillmentHours: number | null;
}

/** Operational order metrics for the Orders analytics bar. */
export function computeOrderStats(
  orders: Order[],
  returns: ProductReturn[],
  start: Date,
  end: Date,
): OrderStats {
  const scoped = orders.filter((o) => inRange(o.createdAt, start, end) && o.status !== "cancelled");
  let itemsOrdered = 0;
  let ordersFulfilled = 0;
  let ordersDelivered = 0;
  let fulfillSum = 0;
  let fulfillCount = 0;

  for (const o of scoped) {
    itemsOrdered += o.items.reduce((s, it) => s + it.qty, 0);
    if (FULFILLED_STATUSES.has(o.status)) ordersFulfilled++;
    if (o.status === "delivered") ordersDelivered++;
    if (o.shippedAt) {
      fulfillSum += (new Date(o.shippedAt).getTime() - new Date(o.createdAt).getTime()) / 3600000;
      fulfillCount++;
    }
  }

  const returnsValue = returns
    .filter((r) => inRange(r.createdAt, start, end))
    .reduce((s, r) => s + (r.totalValue ?? 0), 0);

  return {
    orders: scoped.length,
    itemsOrdered,
    returnsValue,
    ordersFulfilled,
    ordersDelivered,
    fulfillmentHours: fulfillCount > 0 ? fulfillSum / fulfillCount : null,
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
