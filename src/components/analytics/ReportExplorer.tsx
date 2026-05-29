"use client";

import { useMemo, useState } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { ChevronDown, Plus, X } from "lucide-react";
import { useInventory } from "@/contexts/InventoryContext";
import { AnalyticsToolbar, type AnalyticsControls } from "./AnalyticsToolbar";
import { MetricInfo } from "./MetricInfo";
import { METRICS } from "@/lib/analytics/metrics";
import {
  findReport, runReport, metricUnit,
  DIMENSION_LABELS, VISUALIZATION_LABELS,
  type Dimension, type Visualization, type ReportDef, type Unit,
} from "@/lib/analytics/reports";
import {
  resolvePreset, resolveComparison, formatMoney, DEFAULT_CURRENCY,
  type Currency,
} from "@/lib/analytics/date-range";
import { CHANNEL_LABELS } from "@/mock/inventory";
import { cn } from "@/lib/utils";

const COLORS = ["var(--c-blue)", "var(--c-green)", "#7c3aed", "#db2777", "#ea580c", "#0891b2", "#eab308", "#ef4444"];

/** Metric options selectable in the explorer (data-backed + web-analytics). */
const METRIC_OPTIONS = [
  "totalSales", "grossSales", "netSales", "discounts", "averageOrderValue",
  "orders", "itemsOrdered", "returns", "returningCustomerRate",
  "sessions", "conversionRate",
];

const DIMENSION_OPTIONS: Dimension[] = ["day", "channel", "product", "region", "status"];
const VISUALIZATION_OPTIONS: Visualization[] = ["line", "bar", "table"];

function defaultControls(): AnalyticsControls {
  const range = resolvePreset("last30");
  return {
    preset: "last30",
    range,
    comparison: "none",
    comparisonRange: resolveComparison(range, "none"),
    currency: DEFAULT_CURRENCY,
  };
}

function blankReport(): ReportDef {
  return { slug: "explore", title: "Новое исследование", category: "Продажи", metric: "totalSales", dimension: "day", visualization: "line", builtin: false };
}

function Select<T extends string>({
  label, value, options, render, onChange,
}: {
  label: string; value: T; options: readonly T[]; render: (v: T) => string; onChange: (v: T) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-3 py-2 text-left text-sm text-[var(--c-text)] hover:border-[var(--c-blue)]"
      >
        <span className="truncate">{render(value)}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-[var(--c-text3)] transition", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] p-1 shadow-xl">
          {options.map((o) => (
            <button
              key={o}
              onMouseDown={(e) => { e.preventDefault(); onChange(o); setOpen(false); }}
              className={cn(
                "block w-full truncate rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-[var(--c-bg3)]",
                o === value ? "font-medium text-[var(--c-text)]" : "text-[var(--c-text2)]",
              )}
            >
              {render(o)}
            </button>
          ))}
        </div>
      )}
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function ReportExplorer({ slug }: { slug?: string }) {
  const { orders, returns } = useInventory();
  const [controls, setControls] = useState<AnalyticsControls>(defaultControls);
  const [report, setReport] = useState<ReportDef>(() => (slug ? findReport(slug) ?? blankReport() : blankReport()));
  const [channelFilter, setChannelFilter] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);

  const money = (n: number) => formatMoney(n, controls.currency as Currency);
  const fmt = (v: number, unit: Unit) =>
    unit === "money" ? money(v) : unit === "percent" ? `${v.toFixed(1)}%` : v.toLocaleString("ru-RU");

  const filteredOrders = useMemo(
    () => (channelFilter.length === 0 ? orders : orders.filter((o) => channelFilter.includes(o.channel))),
    [orders, channelFilter],
  );

  const result = useMemo(
    () => runReport(report, filteredOrders, returns, controls.range),
    [report, filteredOrders, returns, controls.range],
  );

  const unit = metricUnit(report.metric);
  const chartData = result.rows.map((r) => ({ label: r.label, value: r.value }));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
      {/* Controls panel */}
      <aside className="space-y-4 rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
        <div className="flex gap-1 rounded-lg bg-[var(--c-bg3)] p-1 text-sm">
          <span className="flex-1 rounded-md bg-[var(--c-bg)] px-3 py-1 text-center font-medium text-[var(--c-text)]">Свободный</span>
          <span className="flex-1 px-3 py-1 text-center text-[var(--c-text3)]" title="Скоро">Когорты</span>
        </div>

        <Field label="Показатель">
          <Select
            label="Показатель" value={report.metric} options={METRIC_OPTIONS}
            render={(m) => METRICS[m]?.title ?? m}
            onChange={(m) => setReport((r) => ({ ...r, metric: m }))}
          />
        </Field>

        <Field label="Разрез">
          <Select
            label="Разрез" value={report.dimension} options={DIMENSION_OPTIONS}
            render={(d) => DIMENSION_LABELS[d]}
            onChange={(d) => setReport((r) => ({ ...r, dimension: d }))}
          />
        </Field>

        <Field label="Визуализация">
          <Select
            label="Визуализация" value={report.visualization} options={VISUALIZATION_OPTIONS}
            render={(v) => VISUALIZATION_LABELS[v]}
            onChange={(v) => setReport((r) => ({ ...r, visualization: v }))}
          />
        </Field>

        <Field label="Фильтры">
          <div className="space-y-1.5">
            {channelFilter.map((c) => (
              <span key={c} className="mr-1.5 inline-flex items-center gap-1 rounded-full bg-[var(--c-bg3)] px-2.5 py-1 text-xs text-[var(--c-text)]">
                {CHANNEL_LABELS[c as keyof typeof CHANNEL_LABELS] ?? c}
                <button onClick={() => setChannelFilter((f) => f.filter((x) => x !== c))} className="text-[var(--c-text3)] hover:text-[var(--c-text)]"><X className="h-3 w-3" /></button>
              </span>
            ))}
            <div className="relative">
              <button
                onClick={() => setFilterOpen((o) => !o)}
                onBlur={() => setTimeout(() => setFilterOpen(false), 120)}
                className="inline-flex items-center gap-1 rounded-lg border border-dashed border-[var(--c-border2)] px-2.5 py-1.5 text-xs text-[var(--c-text2)] hover:border-[var(--c-blue)] hover:text-[var(--c-text)]"
              >
                <Plus className="h-3.5 w-3.5" /> Канал
              </button>
              {filterOpen && (
                <div className="absolute left-0 top-full z-30 mt-1 w-48 rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] p-1 shadow-xl">
                  {Object.entries(CHANNEL_LABELS).map(([key, label]) => (
                    <button
                      key={key}
                      onMouseDown={(e) => { e.preventDefault(); setChannelFilter((f) => f.includes(key) ? f : [...f, key]); setFilterOpen(false); }}
                      className="block w-full rounded-md px-2.5 py-1.5 text-left text-sm text-[var(--c-text2)] hover:bg-[var(--c-bg3)]"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Field>
      </aside>

      {/* Visualization */}
      <section className="space-y-4">
        <AnalyticsToolbar value={controls} onChange={setControls} />
        <div className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-5">
          <div className="mb-1 flex items-center gap-2">
            <MetricInfo metric={METRICS[report.metric] ?? { key: report.metric, title: report.title, description: "" }} />
          </div>
          <div className="mb-4 text-2xl font-bold text-[var(--c-text)]">{fmt(result.total, unit)}</div>

          {result.noData ? (
            <div className="flex h-[320px] items-center justify-center text-sm text-[var(--c-text3)]">Нет данных за этот период</div>
          ) : report.visualization === "table" ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--c-border)] text-left text-[var(--c-text3)]">
                    <th className="py-2 font-medium">{DIMENSION_LABELS[report.dimension]}</th>
                    <th className="py-2 text-right font-medium">{METRICS[report.metric]?.title ?? report.metric}</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((r) => (
                    <tr key={r.label} className="border-b border-[var(--c-border)]">
                      <td className="py-2 text-[var(--c-text2)]">{r.label}</td>
                      <td className="py-2 text-right tabular text-[var(--c-text)]">{fmt(r.value, unit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                {report.visualization === "line" ? (
                  <LineChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--c-border)" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--c-text3)" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 11, fill: "var(--c-text3)" }} tickLine={false} axisLine={false} width={56} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--c-border)", background: "var(--c-bg)" }} formatter={(v) => fmt(Number(v), unit)} />
                    <Line type="monotone" dataKey="value" stroke="var(--c-blue)" strokeWidth={2} dot={false} isAnimationActive={false} />
                  </LineChart>
                ) : (
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--c-border)" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--c-text3)" }} tickLine={false} axisLine={false} interval={0} angle={report.dimension === "product" ? -20 : 0} textAnchor={report.dimension === "product" ? "end" : "middle"} height={report.dimension === "product" ? 60 : 30} />
                    <YAxis tick={{ fontSize: 11, fill: "var(--c-text3)" }} tickLine={false} axisLine={false} width={56} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--c-border)", background: "var(--c-bg)" }} formatter={(v) => fmt(Number(v), unit)} cursor={{ fill: "var(--c-bg3)" }} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-[var(--c-text3)]">{label}</div>
      {children}
    </div>
  );
}
