"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
} from "recharts";
import {
  MoreHorizontal, RefreshCw, Maximize, Minimize, Settings2, Plus, X,
  ChevronUp, ChevronDown, RotateCcw, Target as TargetIcon,
} from "lucide-react";
import { useInventory } from "@/contexts/InventoryContext";
import { AnalyticsToolbar, type AnalyticsControls } from "./AnalyticsToolbar";
import { MetricInfo } from "./MetricInfo";
import { CreateTargetModal } from "./CreateTargetModal";
import {
  METRICS, computeSalesTotals, salesOverTime, salesByChannel, salesByProduct,
  type TimePoint,
} from "@/lib/analytics/metrics";
import {
  resolvePreset, resolveComparison, formatMoney, DEFAULT_CURRENCY, type DateRange, type Currency,
} from "@/lib/analytics/date-range";
import { loadTargets, removeTarget, type AnalyticsTarget } from "@/lib/analytics/targets";
import { cn } from "@/lib/utils";

const PRIMARY = "var(--c-blue)";
const COMPARE = "var(--c-text3)";

/** Report slug a breakdown row links into. */
const BREAKDOWN_REPORT: Record<string, string> = {
  grossSales: "gross_sales_over_time",
  discounts: "discounts_over_time",
  returns: "returns_by_product",
  netSales: "net_sales_over_time",
  shippingCharges: "total_sales_over_time",
  returnFees: "total_sales_over_time",
  taxes: "total_sales_over_time",
  totalSales: "total_sales_over_time",
};

// ── Customizable layout ──────────────────────────────────────────────────────
type SectionId = "kpi" | "targets" | "sales" | "channels" | "web";
interface LayoutItem { id: SectionId; visible: boolean }
const SECTION_LABELS: Record<SectionId, string> = {
  kpi: "Ключевые показатели",
  targets: "Цели",
  sales: "Итоговые продажи",
  channels: "Каналы, средний чек, товары",
  web: "Сеансы и конверсия",
};
const DEFAULT_LAYOUT: LayoutItem[] = [
  { id: "kpi", visible: true },
  { id: "targets", visible: true },
  { id: "sales", visible: true },
  { id: "channels", visible: true },
  { id: "web", visible: true },
];
const LAYOUT_KEY = "sellermap_analytics_layout";

function loadLayout(): LayoutItem[] {
  if (typeof window === "undefined") return DEFAULT_LAYOUT;
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
    if (!raw) return DEFAULT_LAYOUT;
    const parsed = JSON.parse(raw) as LayoutItem[];
    // Drop unknown ids and append any new defaults not yet present.
    const known = parsed.filter((p) => p.id in SECTION_LABELS);
    for (const d of DEFAULT_LAYOUT) if (!known.some((k) => k.id === d.id)) known.push(d);
    return known;
  } catch {
    return DEFAULT_LAYOUT;
  }
}

function defaultControls(): AnalyticsControls {
  const range = resolvePreset("today");
  return {
    preset: "today",
    range,
    comparison: "none",
    comparisonRange: resolveComparison(range, "none"),
    currency: DEFAULT_CURRENCY,
  };
}

function dateLegend(r: DateRange): string {
  return r.start.toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
}

function Card({ title, children, className }: { title?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-5", className)}>
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

function KpiCard({ metricKey, value, spark }: { metricKey: string; value: string; spark: TimePoint[] }) {
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
  return <div className="flex h-[180px] items-center justify-center text-sm text-[var(--c-text3)]">Нет данных за этот период</div>;
}

function relativeRefresh(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 5) return "Только что";
  if (s < 60) return `${s} сек. назад`;
  const m = Math.floor(s / 60);
  return `${m} мин. назад`;
}

export function AnalyticsDashboard() {
  const { orders, returns } = useInventory();
  const [controls, setControls] = useState<AnalyticsControls>(defaultControls);
  const { range, comparisonRange, currency } = controls;
  const money = (n: number) => formatMoney(n, currency as Currency);

  // Header interactions
  const containerRef = useRef<HTMLDivElement>(null);
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshedAt, setRefreshedAt] = useState(() => Date.now());
  const [, forceTick] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  // Customize mode
  const [customizing, setCustomizing] = useState(false);
  const [layout, setLayout] = useState<LayoutItem[]>(DEFAULT_LAYOUT);
  const [draftLayout, setDraftLayout] = useState<LayoutItem[]>(DEFAULT_LAYOUT);
  const [addOpen, setAddOpen] = useState(false);

  // Targets
  const [targets, setTargets] = useState<AnalyticsTarget[]>([]);

  useEffect(() => { setLayout(loadLayout()); setTargets(loadTargets()); }, []);

  // Auto-refresh: tick the indicator and refresh timestamp periodically.
  useEffect(() => {
    if (!autoRefresh) return;
    const tick = setInterval(() => forceTick((n) => n + 1), 1000);
    const refresh = setInterval(() => setRefreshedAt(Date.now()), 10000);
    return () => { clearInterval(tick); clearInterval(refresh); };
  }, [autoRefresh]);

  // Track fullscreen state (handles Escape).
  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const totals = useMemo(() => computeSalesTotals(orders, returns, range.start, range.end), [orders, returns, range]);
  const series = useMemo(() => salesOverTime(orders, range.start, range.end), [orders, range]);
  const compareSeries = useMemo(
    () => (comparisonRange ? salesOverTime(orders, comparisonRange.start, comparisonRange.end) : series.map((p) => ({ label: p.label, value: 0 }))),
    [orders, comparisonRange, series],
  );
  const channels = useMemo(() => salesByChannel(orders, range.start, range.end), [orders, range]);
  const products = useMemo(() => salesByProduct(orders, range.start, range.end), [orders, range]);
  const aovSeries = useMemo(() => series.map((p) => ({ label: p.label, value: p.value })), [series]);

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

  const pinnedTargets = targets.filter((t) => t.onDashboard);

  function targetCurrent(metric: string): number {
    switch (metric) {
      case "grossSales": return totals.grossSales;
      case "netSales": return totals.netSales;
      case "orders": return totals.orders;
      case "averageOrderValue": return totals.averageOrderValue;
      case "returningCustomerRate": return totals.returningCustomerRate;
      default: return totals.totalSales;
    }
  }
  function targetFmt(metric: string, n: number): string {
    if (metric === "returningCustomerRate") return `${n.toFixed(1)}%`;
    if (metric === "orders") return n.toLocaleString("ru-RU");
    return money(n);
  }

  async function toggleFullscreen() {
    setMoreOpen(false);
    if (!containerRef.current) return;
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
    else await containerRef.current.requestFullscreen().catch(() => {});
  }

  function startCustomize() {
    setMoreOpen(false);
    setDraftLayout(layout);
    setCustomizing(true);
  }
  function saveCustomize() {
    setLayout(draftLayout);
    saveLayout(draftLayout);
    setCustomizing(false);
  }
  function saveLayout(l: LayoutItem[]) {
    try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(l)); } catch { /* non-fatal */ }
  }
  function moveSection(id: SectionId, dir: -1 | 1) {
    setDraftLayout((prev) => {
      const i = prev.findIndex((p) => p.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = prev.slice();
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }
  function setVisible(id: SectionId, visible: boolean) {
    setDraftLayout((prev) => prev.map((p) => (p.id === id ? { ...p, visible } : p)));
  }

  function dropTarget(id: string) {
    setTargets(removeTarget(id));
  }

  const activeLayout = customizing ? draftLayout : layout;
  const hiddenSections = activeLayout.filter((s) => !s.visible);

  function renderSection(id: SectionId) {
    switch (id) {
      case "kpi":
        return (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard metricKey="grossSales" value={money(totals.grossSales)} spark={series} />
            <KpiCard metricKey="returningCustomerRate" value={`${totals.returningCustomerRate.toFixed(0)}%`} spark={series} />
            <KpiCard metricKey="ordersFulfilled" value={String(totals.ordersFulfilled)} spark={series} />
            <KpiCard metricKey="orders" value={String(totals.orders)} spark={series} />
          </div>
        );
      case "targets":
        if (pinnedTargets.length === 0) {
          return customizing ? (
            <Card><div className="py-2 text-center text-sm text-[var(--c-text3)]">Целей пока нет. Нажмите «Создать цель», чтобы добавить.</div></Card>
          ) : null;
        }
        return (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {pinnedTargets.map((t) => {
              const cur = targetCurrent(t.metric);
              const pct = t.amount > 0 ? Math.min(100, (cur / t.amount) * 100) : 0;
              return (
                <Card key={t.id}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-1.5 text-sm font-medium text-[var(--c-text)]"><TargetIcon className="h-4 w-4 text-[var(--c-blue)]" />{t.name}</div>
                    <button onClick={() => dropTarget(t.id)} className="rounded p-0.5 text-[var(--c-text3)] hover:bg-[var(--c-bg3)] hover:text-[var(--c-text)]" aria-label="Удалить цель"><X className="h-3.5 w-3.5" /></button>
                  </div>
                  <div className="mt-2 text-xs text-[var(--c-text3)]">{METRICS[t.metric]?.title} · {t.period}</div>
                  <div className="mt-2 flex items-end justify-between text-sm">
                    <span className="font-semibold text-[var(--c-text)]">{targetFmt(t.metric, cur)}</span>
                    <span className="text-[var(--c-text3)]">из {targetFmt(t.metric, t.amount)}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--c-bg3)]">
                    <div className="h-full rounded-full bg-[var(--c-blue)]" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-1 text-right text-xs text-[var(--c-text2)]">{pct.toFixed(0)}%</div>
                </Card>
              );
            })}
          </div>
        );
      case "sales":
        return (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <OverTimeChart
                metricKey="totalSales" big={money(totals.totalSales)}
                primary={series} compare={compareSeries}
                primaryLabel={primaryLabel} compareLabel={compareLabel} showCompare={showCompare}
              />
            </div>
            <Card title={<MetricInfo metric={{ key: "tsb", title: "Структура итоговых продаж", description: "Из чего складываются итоговые продажи за период." }} />}>
              <div className="divide-y divide-[var(--c-border)]">
                {breakdown.map((b) => (
                  <div key={b.key} className={cn("flex items-center justify-between py-2.5 text-sm", b.bold && "font-semibold")}>
                    <Link href={`/inventory/analytics/reports/explore?report=${BREAKDOWN_REPORT[b.key] ?? "total_sales_over_time"}`} className="text-[var(--c-blue)] hover:underline">
                      {METRICS[b.key]?.title ?? b.key}
                    </Link>
                    <span className="tabular text-[var(--c-text)]">{money(b.value)}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        );
      case "channels":
        return (
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
        );
      case "web":
        return (
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
                {["Сеансы", "Добавлено в корзину", "Дошли до оформления", "Завершили оформление"].map((s) => (
                  <div key={s}>
                    <div className="text-xs text-[var(--c-text3)]">{s}</div>
                    <div className="text-[var(--c-text)]">0% <span className="text-[var(--c-text3)]">0</span></div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <div ref={containerRef} className={cn("space-y-4", fullscreen && "overflow-y-auto bg-[var(--c-bg)] p-6")}>
      {/* Action header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm text-[var(--c-text2)]">
          {autoRefresh && (
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--c-blue)]" />
              {relativeRefresh(refreshedAt)}
            </span>
          )}
        </div>

        {customizing ? (
          <div className="flex items-center gap-2">
            <div className="relative">
              <button onClick={() => setAddOpen((o) => !o)} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-1.5 text-sm font-medium text-[var(--c-text)] hover:bg-[var(--c-bg)]">
                <Plus className="h-4 w-4" /> Добавить раздел
              </button>
              {addOpen && (
                <div className="absolute right-0 top-full z-40 mt-1 w-56 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg)] p-1 shadow-xl">
                  {hiddenSections.length === 0 ? (
                    <div className="px-2.5 py-2 text-sm text-[var(--c-text3)]">Все разделы добавлены</div>
                  ) : hiddenSections.map((s) => (
                    <button key={s.id} onClick={() => { setVisible(s.id, true); setAddOpen(false); }} className="block w-full rounded-md px-2.5 py-1.5 text-left text-sm text-[var(--c-text)] hover:bg-[var(--c-bg3)]">{SECTION_LABELS[s.id]}</button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => setDraftLayout(DEFAULT_LAYOUT)} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-1.5 text-sm font-medium text-[var(--c-text)] hover:bg-[var(--c-bg)]">
              <RotateCcw className="h-4 w-4" /> Сбросить
            </button>
            <button onClick={() => setCustomizing(false)} className="rounded-lg border border-[var(--c-border)] px-3 py-1.5 text-sm font-medium text-[var(--c-text)] hover:bg-[var(--c-bg)]">Отмена</button>
            <button onClick={saveCustomize} className="rounded-lg bg-[var(--c-text)] px-3 py-1.5 text-sm font-medium text-[var(--c-bg)] hover:opacity-90">Сохранить</button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button onClick={() => setShowTargetModal(true)} className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-1.5 text-sm font-medium text-[var(--c-text)] transition hover:bg-[var(--c-bg)]">
              Создать цель
            </button>
            <Link href="/inventory/analytics/reports/explore" className="rounded-lg bg-[var(--c-text)] px-3 py-1.5 text-sm font-medium text-[var(--c-bg)] transition hover:opacity-90">
              Новое исследование
            </Link>
            <div className="relative">
              <button onClick={() => setMoreOpen((o) => !o)} className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] p-2 text-[var(--c-text2)] transition hover:bg-[var(--c-bg)]" aria-label="Ещё">
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {moreOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setMoreOpen(false)} />
                  <div className="absolute right-0 top-full z-40 mt-1 w-60 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg)] p-1 shadow-xl">
                    <button onClick={() => { setAutoRefresh((v) => !v); setRefreshedAt(Date.now()); setMoreOpen(false); }} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-[var(--c-text)] hover:bg-[var(--c-bg3)]">
                      <RefreshCw className="h-4 w-4 text-[var(--c-text2)]" /> {autoRefresh ? "Выключить автообновление" : "Включить автообновление"}
                    </button>
                    <button onClick={toggleFullscreen} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-[var(--c-text)] hover:bg-[var(--c-bg3)]">
                      {fullscreen ? <Minimize className="h-4 w-4 text-[var(--c-text2)]" /> : <Maximize className="h-4 w-4 text-[var(--c-text2)]" />} {fullscreen ? "Выйти из полноэкранного режима" : "Развернуть на весь экран"}
                    </button>
                    <button onClick={startCustomize} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-[var(--c-text)] hover:bg-[var(--c-bg3)]">
                      <Settings2 className="h-4 w-4 text-[var(--c-text2)]" /> Настроить
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <AnalyticsToolbar value={controls} onChange={setControls} />

      {customizing && (
        <div className="rounded-xl border border-dashed border-[var(--c-blue)] bg-[var(--c-blue)]/5 px-4 py-2.5 text-sm text-[var(--c-text2)]">
          Режим настройки: перемещайте разделы стрелками, скрывайте крестиком и добавляйте через «Добавить раздел».
        </div>
      )}

      {/* Sections */}
      {activeLayout.filter((s) => s.visible).map((s) => {
        const content = renderSection(s.id);
        if (!content) return null;
        if (!customizing) return <div key={s.id}>{content}</div>;
        return (
          <div key={s.id} className="rounded-2xl border border-dashed border-[var(--c-border2)] p-2">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-xs font-medium uppercase tracking-wide text-[var(--c-text3)]">{SECTION_LABELS[s.id]}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => moveSection(s.id, -1)} className="rounded p-1 text-[var(--c-text3)] hover:bg-[var(--c-bg3)] hover:text-[var(--c-text)]" aria-label="Вверх"><ChevronUp className="h-4 w-4" /></button>
                <button onClick={() => moveSection(s.id, 1)} className="rounded p-1 text-[var(--c-text3)] hover:bg-[var(--c-bg3)] hover:text-[var(--c-text)]" aria-label="Вниз"><ChevronDown className="h-4 w-4" /></button>
                <button onClick={() => setVisible(s.id, false)} className="rounded p-1 text-[var(--c-text3)] hover:bg-[var(--c-bg3)] hover:text-[var(--c-text)]" aria-label="Скрыть"><X className="h-4 w-4" /></button>
              </div>
            </div>
            {content}
          </div>
        );
      })}

      {showTargetModal && (
        <CreateTargetModal onClose={() => setShowTargetModal(false)} onSaved={() => setTargets(loadTargets())} />
      )}
    </div>
  );
}
