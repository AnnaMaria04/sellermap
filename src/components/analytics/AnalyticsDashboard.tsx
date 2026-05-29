"use client";

import { useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
} from "recharts";
import { useInventory } from "@/contexts/InventoryContext";
import { AnalyticsToolbar, type AnalyticsControls } from "./AnalyticsToolbar";
import { MetricInfo } from "./MetricInfo";
import {
  METRICS, computeSalesTotals, salesOverTime, salesByChannel, salesByProduct,
  type TimePoint,
} from "@/lib/analytics/metrics";
import {
  resolvePreset, resolveComparison, formatMoney, type DateRange, type Currency,
} from "@/lib/analytics/date-range";
import { cn } from "@/lib/utils";

const PRIMARY = "#1f6feb";
const COMPARE = "#9ecbff";

function defaultControls(): AnalyticsControls {
  const range = resolvePreset("today");
  return {
    preset: "today",
    range,
    comparison: "none",
    comparisonRange: resolveComparison(range, "none"),
    currency: "USD $",
  };
}

function dateLegend(r: DateRange): string {
  return r.start.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function Card({ title, children, className }: { title?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg)] p-5", className)}>
      {title && <div className="mb-3 text-sm">{title}</div>}
      {children}
    </div>
  );
}

function Sparkline({ data, color = PRIMARY }: { data: TimePoint[]; color?: string }) {
  return (
    <div className="h-8 w-24">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function KpiCard({
  metricKey, value, spark,
}: {
  metricKey: string; value: string; spark: TimePoint[];
}) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <MetricInfo metric={METRICS[metricKey]} className="text-sm" />
          <div className="mt-1.5 flex items-center gap-1.5">
            <span className="text-xl font-semibold text-[var(--c-text)]">{value}</span>
            <span className="text-[var(--c-text3)]">—</span>
          </div>
        </div>
        <Sparkline data={spark} />
      </div>
    </Card>
  );
}

function OverTimeChart({
  metricKey, big, primary, compare, primaryLabel, compareLabel, showCompare,
}: {
  metricKey: string; big: string; primary: TimePoint[]; compare: TimePoint[];
  primaryLabel: string; compareLabel: string; showCompare: boolean;
}) {
  const data = primary.map((p, i) => ({ label: p.label, primary: p.value, compare: compare[i]?.value ?? 0 }));
  return (
    <Card title={<MetricInfo metric={METRICS[metricKey]} />}>
      <div className="mb-2 flex items-center gap-1.5">
        <span className="text-2xl font-bold text-[var(--c-text)]">{big}</span>
        <span className="text-[var(--c-text3)]">—</span>
      </div>
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--c-border)" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--c-text3)" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 11, fill: "var(--c-text3)" }} tickLine={false} axisLine={false} width={48} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--c-border)", background: "var(--c-bg)" }} />
            {showCompare && <Line type="monotone" dataKey="compare" stroke={COMPARE} strokeWidth={2} dot={false} isAnimationActive={false} />}
            <Line type="monotone" dataKey="primary" stroke={PRIMARY} strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex items-center justify-center gap-5 text-xs text-[var(--c-text2)]">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: PRIMARY }} />{primaryLabel}</span>
        {showCompare && <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: COMPARE }} />{compareLabel}</span>}
      </div>
    </Card>
  );
}

function NoData() {
  return (
    <div className="flex h-[180px] items-center justify-center text-sm text-[var(--c-text3)]">
      No data for this date range
    </div>
  );
}

export function AnalyticsDashboard() {
  const { orders, returns } = useInventory();
  const [controls, setControls] = useState<AnalyticsControls>(defaultControls);
  const { range, comparisonRange, currency } = controls;
  const money = (n: number) => formatMoney(n, currency as Currency);

  const totals = useMemo(() => computeSalesTotals(orders, returns, range.start, range.end), [orders, returns, range]);
  const series = useMemo(() => salesOverTime(orders, range.start, range.end), [orders, range]);
  const compareSeries = useMemo(
    () => (comparisonRange ? salesOverTime(orders, comparisonRange.start, comparisonRange.end) : series.map((p) => ({ label: p.label, value: 0 }))),
    [orders, comparisonRange, series],
  );
  const channels = useMemo(() => salesByChannel(orders, range.start, range.end), [orders, range]);
  const products = useMemo(() => salesByProduct(orders, range.start, range.end), [orders, range]);
  const aovSeries = useMemo(
    () => series.map((p) => ({ label: p.label, value: p.value })), // revenue proxy for AOV trend shape
    [series],
  );

  const showCompare = !!comparisonRange;
  const primaryLabel = dateLegend(range);
  const compareLabel = comparisonRange ? dateLegend(comparisonRange) : "";

  const breakdown: { key: string; value: number; bold?: boolean }[] = [
    { key: "grossSales", value: totals.grossSales },
    { key: "discounts", value: -totals.discounts },
    { key: "returns", value: -totals.returns },
    { key: "netSales", value: totals.netSales },
    { key: "shippingCharges", value: totals.shippingCharges },
    { key: "returnFees", value: totals.returnFees },
    { key: "taxes", value: totals.taxes },
    { key: "totalSales", value: totals.totalSales, bold: true },
  ];

  return (
    <div className="space-y-4">
      <AnalyticsToolbar value={controls} onChange={setControls} />

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard metricKey="grossSales" value={money(totals.grossSales)} spark={series} />
        <KpiCard metricKey="returningCustomerRate" value={`${totals.returningCustomerRate.toFixed(0)}%`} spark={series} />
        <KpiCard metricKey="ordersFulfilled" value={String(totals.ordersFulfilled)} spark={series} />
        <KpiCard metricKey="orders" value={String(totals.orders)} spark={series} />
      </div>

      {/* Total sales over time + breakdown */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <OverTimeChart
            metricKey="totalSales" big={money(totals.totalSales)}
            primary={series} compare={compareSeries}
            primaryLabel={primaryLabel} compareLabel={compareLabel} showCompare={showCompare}
          />
        </div>
        <Card title={<MetricInfo metric={{ key: "tsb", title: "Total sales breakdown", description: "How total sales is composed for the period." }} />}>
          <div className="divide-y divide-[var(--c-border)]">
            {breakdown.map((b) => (
              <div key={b.key} className={cn("flex items-center justify-between py-2.5 text-sm", b.bold && "font-semibold")}>
                <MetricInfo metric={METRICS[b.key]} className={cn("text-[var(--c-blue)] no-underline", "decoration-transparent")} />
                <span className="tabular text-[var(--c-text)]">{money(b.value)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Channel / AOV / Product */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title={<MetricInfo metric={METRICS.salesByChannel} />}>
          {channels.length === 0 ? <NoData /> : (
            <div className="space-y-2 pt-1">
              {channels.map((c) => (
                <div key={c.label} className="flex items-center justify-between text-sm">
                  <span className="capitalize text-[var(--c-text2)]">{c.label}</span>
                  <span className="tabular text-[var(--c-text)]">{money(c.value)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <OverTimeChart
          metricKey="averageOrderValue" big={money(totals.averageOrderValue)}
          primary={aovSeries} compare={compareSeries}
          primaryLabel={primaryLabel} compareLabel={compareLabel} showCompare={showCompare}
        />

        <Card title={<MetricInfo metric={METRICS.salesByProduct} />}>
          {products.length === 0 ? <NoData /> : (
            <div className="space-y-2 pt-1">
              {products.map((p) => (
                <div key={p.label} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate text-[var(--c-text2)]">{p.label}</span>
                  <span className="tabular text-[var(--c-text)]">{money(p.value)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Sessions / Conversion (web analytics — no source, reports zero) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title={<MetricInfo metric={METRICS.sessions} />}>
          <div className="mb-2 text-2xl font-bold text-[var(--c-text)]">0 <span className="text-[var(--c-text3)]">—</span></div>
          <NoData />
        </Card>
        <Card title={<MetricInfo metric={METRICS.conversionRate} />}>
          <div className="mb-2 text-2xl font-bold text-[var(--c-text)]">0% <span className="text-[var(--c-text3)]">—</span></div>
          <NoData />
        </Card>
        <Card title={<MetricInfo metric={METRICS.conversionBreakdown} />}>
          <div className="mb-3 text-2xl font-bold text-[var(--c-text)]">0% <span className="text-[var(--c-text3)]">—</span></div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {["Sessions", "Added to cart", "Reached checkout", "Completed checkout"].map((s) => (
              <div key={s}>
                <div className="text-xs text-[var(--c-text3)]">{s}</div>
                <div className="text-[var(--c-text)]">0% <span className="text-[var(--c-text3)]">0</span></div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
