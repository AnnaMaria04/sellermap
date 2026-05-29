import type { Order, ProductReturn } from "@/mock/inventory";
import { CHANNEL_LABELS, ORDER_STATUS_LABELS } from "@/mock/inventory";
import type { DateRange } from "./date-range";

/**
 * Report catalogue + query engine.
 *
 * A "report" is a saved exploration query: a metric measured across a
 * dimension, drawn as a visualization. The Reports list surfaces them and the
 * exploration view (`ReportExplorer`) runs them against the workspace orders.
 * Web-only metrics (sessions, conversion) have no source in this app and
 * resolve to an empty "no data" state, matching the dashboard.
 */

export type ReportCategory =
  | "Продажи"
  | "Заказы"
  | "Клиенты"
  | "Финансы"
  | "Запасы"
  | "Маркетинг"
  | "Поведение";

export const REPORT_CATEGORIES: ReportCategory[] = [
  "Продажи", "Заказы", "Клиенты", "Финансы", "Запасы", "Маркетинг", "Поведение",
];

export type Dimension = "day" | "channel" | "product" | "region" | "status";
export type Visualization = "line" | "bar" | "table";

export interface ReportDef {
  slug: string;
  title: string;
  category: ReportCategory;
  /** Primary metric key (see METRICS in metrics.ts). */
  metric: string;
  dimension: Dimension;
  visualization: Visualization;
  /** Built-in reports are authored by SellerMap; false = created by the user. */
  builtin: boolean;
}

export const DIMENSION_LABELS: Record<Dimension, string> = {
  day: "По дням",
  channel: "По каналам",
  product: "По товарам",
  region: "По регионам",
  status: "По статусу",
};

export const VISUALIZATION_LABELS: Record<Visualization, string> = {
  line: "Линейный график",
  bar: "Столбчатая диаграмма",
  table: "Таблица",
};

/** The built-in report library shown on the Reports page. */
export const REPORTS: ReportDef[] = [
  { slug: "total_sales_over_time", title: "Итоговые продажи по времени", category: "Продажи", metric: "totalSales", dimension: "day", visualization: "line", builtin: true },
  { slug: "gross_sales_over_time", title: "Валовые продажи по времени", category: "Продажи", metric: "grossSales", dimension: "day", visualization: "line", builtin: true },
  { slug: "net_sales_over_time", title: "Чистые продажи по времени", category: "Продажи", metric: "netSales", dimension: "day", visualization: "line", builtin: true },
  { slug: "sales_by_channel", title: "Продажи по каналам", category: "Продажи", metric: "totalSales", dimension: "channel", visualization: "bar", builtin: true },
  { slug: "sales_by_product", title: "Продажи по товарам", category: "Продажи", metric: "grossSales", dimension: "product", visualization: "bar", builtin: true },
  { slug: "sales_by_region", title: "Продажи по регионам", category: "Продажи", metric: "totalSales", dimension: "region", visualization: "bar", builtin: true },
  { slug: "orders_over_time", title: "Заказы по времени", category: "Заказы", metric: "orders", dimension: "day", visualization: "line", builtin: true },
  { slug: "orders_by_status", title: "Заказы по статусу", category: "Заказы", metric: "orders", dimension: "status", visualization: "bar", builtin: true },
  { slug: "items_ordered_over_time", title: "Товаров заказано по времени", category: "Заказы", metric: "itemsOrdered", dimension: "day", visualization: "line", builtin: true },
  { slug: "average_order_value_over_time", title: "Средний чек по времени", category: "Финансы", metric: "averageOrderValue", dimension: "day", visualization: "line", builtin: true },
  { slug: "discounts_over_time", title: "Скидки по времени", category: "Финансы", metric: "discounts", dimension: "day", visualization: "line", builtin: true },
  { slug: "returns_by_product", title: "Возвраты по товарам", category: "Заказы", metric: "returns", dimension: "product", visualization: "table", builtin: true },
  { slug: "returning_customer_rate", title: "Доля повторных клиентов", category: "Клиенты", metric: "returningCustomerRate", dimension: "day", visualization: "line", builtin: true },
  { slug: "sessions_over_time", title: "Сеансы по времени", category: "Поведение", metric: "sessions", dimension: "day", visualization: "line", builtin: true },
  { slug: "conversion_rate_over_time", title: "Конверсия по времени", category: "Поведение", metric: "conversionRate", dimension: "day", visualization: "line", builtin: true },
];

export function findReport(slug: string): ReportDef | undefined {
  return REPORTS.find((r) => r.slug === slug);
}

// ── Query engine ─────────────────────────────────────────────────────────────

export type Unit = "money" | "count" | "percent";

const COUNT_METRICS = new Set(["orders", "ordersFulfilled", "itemsOrdered", "sessions"]);
const PERCENT_METRICS = new Set(["conversionRate", "returningCustomerRate"]);
/** Web-analytics metrics with no source in this app → "no data". */
const NO_DATA_METRICS = new Set(["sessions", "conversionRate", "conversionBreakdown"]);

export function metricUnit(metric: string): Unit {
  if (PERCENT_METRICS.has(metric)) return "percent";
  if (COUNT_METRICS.has(metric)) return "count";
  return "money";
}

function inRange(iso: string, range: DateRange): boolean {
  const t = new Date(iso).getTime();
  return t >= range.start.getTime() && t <= range.end.getTime();
}

/** The metric's value contribution for a single order. */
function orderValue(metric: string, o: Order): number {
  switch (metric) {
    case "grossSales":
      return o.items.reduce((s, it) => s + it.unitPrice * it.qty, 0);
    case "discounts":
      return Math.max(0, o.items.reduce((s, it) => s + it.unitPrice * it.qty, 0) - o.revenue);
    case "itemsOrdered":
      return o.items.reduce((s, it) => s + it.qty, 0);
    case "orders":
      return 1;
    case "shippingCharges":
      return o.logisticsCost ?? 0;
    default:
      // netSales / totalSales / averageOrderValue and other money metrics.
      return o.revenue;
  }
}

export interface ReportRow {
  label: string;
  value: number;
}

export interface ReportResult {
  rows: ReportRow[];
  total: number;
  unit: Unit;
  noData: boolean;
}

function bucketByDay(orders: Order[], range: DateRange, metric: string): ReportRow[] {
  const sameDay = range.end.getTime() - range.start.getTime() <= 24 * 3600 * 1000;
  if (sameDay) {
    const buckets = Array.from({ length: 24 }, () => 0);
    for (const o of orders) buckets[new Date(o.createdAt).getHours()] += orderValue(metric, o);
    return buckets
      .map((value, h) => ({ h, value }))
      .filter(({ h }) => h % 2 === 0)
      .map(({ h, value }) => ({ label: hourLabel(h), value }));
  }
  const byDay = new Map<string, number>();
  for (const o of orders) {
    const d = new Date(o.createdAt);
    byDay.set(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`, (byDay.get(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`) ?? 0) + orderValue(metric, o));
  }
  const out: ReportRow[] = [];
  const cursor = new Date(range.start);
  while (cursor <= range.end) {
    const key = `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`;
    out.push({ label: cursor.toLocaleDateString("ru-RU", { day: "numeric", month: "short" }), value: byDay.get(key) ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

function hourLabel(h: number): string {
  return `${String(h).padStart(2, "0")}:00`;
}

function groupBy(orders: Order[], metric: string, keyOf: (o: Order) => string): ReportRow[] {
  const map = new Map<string, number>();
  for (const o of orders) map.set(keyOf(o), (map.get(keyOf(o)) ?? 0) + orderValue(metric, o));
  return [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

function groupByProduct(orders: Order[], metric: string): ReportRow[] {
  const map = new Map<string, number>();
  for (const o of orders) {
    for (const it of o.items) {
      const v = metric === "itemsOrdered" ? it.qty : it.unitPrice * it.qty;
      map.set(it.productName, (map.get(it.productName) ?? 0) + v);
    }
  }
  return [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 20);
}

/** Runs a report against the workspace orders for the given range. */
export function runReport(report: ReportDef, orders: Order[], returns: ProductReturn[], range: DateRange): ReportResult {
  const unit = metricUnit(report.metric);

  if (NO_DATA_METRICS.has(report.metric)) {
    return { rows: [], total: 0, unit, noData: true };
  }

  const scoped = orders.filter((o) => inRange(o.createdAt, range) && o.status !== "cancelled");

  // Returns reports read the returns collection rather than orders. Each
  // return's total value is spread across its items by quantity share.
  if (report.metric === "returns") {
    const scopedReturns = returns.filter((r) => inRange(r.createdAt, range));
    const map = new Map<string, number>();
    for (const r of scopedReturns) {
      const totalQty = r.items.reduce((s, it) => s + it.qty, 0) || 1;
      for (const it of r.items) {
        const share = (r.totalValue ?? 0) * (it.qty / totalQty);
        map.set(it.productName, (map.get(it.productName) ?? 0) + share);
      }
    }
    const rows = [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
    return { rows, total: rows.reduce((s, r) => s + r.value, 0), unit: "money", noData: rows.length === 0 };
  }

  // Returning-customer rate is a single derived percentage over the period.
  if (report.metric === "returningCustomerRate") {
    const counts = new Map<string, number>();
    for (const o of scoped) {
      const c = o.customerId ?? o.customerName;
      if (c) counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    const total = counts.size;
    const returning = [...counts.values()].filter((n) => n > 1).length;
    const pct = total > 0 ? (returning / total) * 100 : 0;
    return { rows: bucketByDay(scoped, range, "orders").map((r) => ({ label: r.label, value: pct })), total: pct, unit: "percent", noData: total === 0 };
  }

  let rows: ReportRow[];
  switch (report.dimension) {
    case "channel":
      rows = groupBy(scoped, report.metric, (o) => CHANNEL_LABELS[o.channel] ?? o.channel);
      break;
    case "region":
      rows = groupBy(scoped, report.metric, (o) => o.region ?? "Не указан");
      break;
    case "status":
      rows = groupBy(scoped, report.metric, (o) => ORDER_STATUS_LABELS[o.status] ?? o.status);
      break;
    case "product":
      rows = groupByProduct(scoped, report.metric);
      break;
    case "day":
    default:
      rows = bucketByDay(scoped, range, report.metric);
      break;
  }

  let total = rows.reduce((s, r) => s + r.value, 0);
  if (report.metric === "averageOrderValue") {
    total = scoped.length > 0 ? scoped.reduce((s, o) => s + o.revenue, 0) / scoped.length : 0;
  }

  return { rows, total, unit, noData: scoped.length === 0 };
}
