"use client";

import { useMemo, useState } from "react";
import {
  RefreshCw,
  Layers,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  DollarSign,
  Package,
  ArrowUpDown,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useInventory } from "@/contexts/InventoryContext";
import {
  computeProductMetrics,
  summarizeAnalytics,
  type ProductMetrics,
  type ABCClass,
} from "@/lib/inventory/analytics";
import { getAvailableStock } from "@/mock/inventory";
import { cn, formatRub } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WINDOWS = [
  { days: 30, label: "30 дней" },
  { days: 60, label: "60 дней" },
  { days: 90, label: "90 дней" },
];

const ABC_META: Record<
  ABCClass,
  { label: string; color: string; bg: string; desc: string }
> = {
  A: {
    label: "A",
    color: "text-[var(--c-green)]",
    bg: "bg-[var(--c-green)]",
    desc: "≈80% стоимости запасов",
  },
  B: {
    label: "B",
    color: "text-[var(--c-amber)]",
    bg: "bg-[var(--c-amber)]",
    desc: "≈15% стоимости запасов",
  },
  C: {
    label: "C",
    color: "text-[var(--c-text2)]",
    bg: "bg-[var(--c-text3)]",
    desc: "≈5% стоимости запасов",
  },
};

function rub(n: number): string {
  return formatRub(n);
}

type SortKey = "daysOfStock" | "turnover" | "name" | "velocity";
type SortDir = "asc" | "desc";

// ---------------------------------------------------------------------------
// Days-of-stock color helper
// ---------------------------------------------------------------------------

function daysColor(days: number): string {
  if (days < 7) return "text-[var(--c-red)]";
  if (days <= 30) return "text-[var(--c-amber)]";
  if (days > 90) return "text-[var(--c-blue)]";
  return "text-[var(--c-green)]";
}

function daysBg(days: number): string {
  if (days < 7) return "bg-[var(--c-red-dim)] border-[rgba(240,80,80,0.2)]";
  if (days <= 30) return "bg-[var(--c-amber-dim)] border-[rgba(245,166,35,0.2)]";
  if (days > 90) return "bg-[var(--c-blue-dim)] border-[rgba(59,130,246,0.2)]";
  return "bg-[var(--c-green-dim)] border-[rgba(31,209,131,0.2)]";
}

function daysLabel(days: number): string {
  if (days < 7) return "Срочный заказ";
  if (days <= 30) return "Заказать скоро";
  if (days > 90) return "Избыток";
  return "В норме";
}

// ---------------------------------------------------------------------------
// Category average turnover
// ---------------------------------------------------------------------------

interface CategoryRow {
  category: string;
  avgDays: number;
  avgVelocity: number;
  count: number;
}

function buildCategoryRows(metrics: ProductMetrics[]): CategoryRow[] {
  const map = new Map<string, { sumDays: number; sumVelocity: number; count: number }>();
  for (const m of metrics) {
    const cat = m.product.category || "Без категории";
    const days = m.daysOfInventory === Infinity ? 0 : m.daysOfInventory;
    const existing = map.get(cat) ?? { sumDays: 0, sumVelocity: 0, count: 0 };
    existing.sumDays += days;
    existing.sumVelocity += m.salesVelocity;
    existing.count += 1;
    map.set(cat, existing);
  }
  return [...map.entries()]
    .map(([category, v]) => ({
      category,
      avgDays: v.count > 0 ? v.sumDays / v.count : 0,
      avgVelocity: v.count > 0 ? v.sumVelocity / v.count : 0,
      count: v.count,
    }))
    .sort((a, b) => b.avgVelocity - a.avgVelocity);
}

// ---------------------------------------------------------------------------
// SortIcon (module-scope to avoid React Compiler "cannot create during render")
// ---------------------------------------------------------------------------

function SortIcon({
  col, sortKey, sortDir,
}: { col: string; sortKey: string; sortDir: "asc" | "desc" }) {
  if (sortKey !== col)
    return <ArrowUpDown size={11} className="text-[var(--c-text3)]" />;
  return (
    <ArrowUpDown
      size={11}
      className={cn(
        "transition",
        sortDir === "asc"
          ? "text-[var(--c-green)]"
          : "text-[var(--c-green)] rotate-180",
      )}
    />
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TurnoverAnalysis() {
  const { products, movements } = useInventory();
  const [windowDays, setWindowDays] = useState(30);
  const [sortKey, setSortKey] = useState<SortKey>("daysOfStock");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [showAll, setShowAll] = useState(false);

  const metrics = useMemo(
    () =>
      computeProductMetrics(products, movements, {
        windowDays,
        deadStockDays: 60,
      }),
    [products, movements, windowDays],
  );
  const summary = useMemo(
    () => summarizeAnalytics(metrics, windowDays),
    [metrics, windowDays],
  );

  // ---- Sorted turnover table -----------------------------------------------

  const sortedMetrics = useMemo(() => {
    const copy = [...metrics];
    copy.sort((a, b) => {
      let valA: number;
      let valB: number;
      switch (sortKey) {
        case "name":
          return sortDir === "asc"
            ? a.product.name.localeCompare(b.product.name, "ru")
            : b.product.name.localeCompare(a.product.name, "ru");
        case "velocity":
          valA = a.salesVelocity;
          valB = b.salesVelocity;
          break;
        case "turnover":
          valA = a.turnoverRatio;
          valB = b.turnoverRatio;
          break;
        case "daysOfStock":
        default:
          // Infinity → treat as very large
          valA = a.daysOfInventory === Infinity ? 9999 : a.daysOfInventory;
          valB = b.daysOfInventory === Infinity ? 9999 : b.daysOfInventory;
          break;
      }
      return sortDir === "asc" ? valA - valB : valB - valA;
    });
    return copy;
  }, [metrics, sortKey, sortDir]);

  const displayedMetrics = showAll ? sortedMetrics : sortedMetrics.slice(0, 15);

  // ---- ABC data for existing chart bar -----

  const leaders = useMemo(
    () =>
      [...metrics]
        .filter((m) => m.turnoverRatio > 0)
        .sort((a, b) => b.turnoverRatio - a.turnoverRatio)
        .slice(0, 5),
    [metrics],
  );
  const laggards = useMemo(
    () =>
      [...metrics]
        .sort((a, b) => a.turnoverRatio - b.turnoverRatio)
        .slice(0, 5),
    [metrics],
  );
  const deadStock = useMemo(
    () =>
      metrics
        .filter((m) => m.isDeadStock)
        .sort((a, b) => b.inventoryValue - a.inventoryValue),
    [metrics],
  );

  const abcTotal =
    summary.abcCounts.A + summary.abcCounts.B + summary.abcCounts.C || 1;

  // ---- Category chart data -------------------------------------------------

  const categoryRows = useMemo(() => buildCategoryRows(metrics), [metrics]);

  const barChartData = categoryRows.slice(0, 8).map((row) => ({
    name:
      row.category.length > 14
        ? row.category.slice(0, 12) + "…"
        : row.category,
    fullName: row.category,
    days: Math.round(row.avgDays),
    velocity: Math.round(row.avgVelocity * 100) / 100,
    count: row.count,
  }));

  // ---- Sort toggle helper --------------------------------------------------

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  // ---- Render --------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header + window selector */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--c-text)]">
            Оборачиваемость и ABC-анализ
          </h2>
          <p className="mt-0.5 text-xs text-[var(--c-text3)]">
            Метрики рассчитаны по движениям склада за выбранный период
          </p>
        </div>
        <div className="flex gap-1 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-1">
          {WINDOWS.map((w) => (
            <button
              key={w.days}
              onClick={() => setWindowDays(w.days)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition whitespace-nowrap",
                windowDays === w.days
                  ? "bg-[var(--c-bg3)] text-[var(--c-text)]"
                  : "text-[var(--c-text2)] hover:text-[var(--c-text)]",
              )}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPI
          label="Средняя оборачиваемость"
          value={`${summary.avgTurnover.toFixed(1)}×`}
          sub="в год"
          icon={<RefreshCw size={16} />}
          color="text-[var(--c-green)]"
        />
        <KPI
          label="Sell-through"
          value={`${Math.round(summary.avgSellThrough * 100)}%`}
          sub="продано / запас"
          icon={<TrendingUp size={16} />}
          color="text-[var(--c-blue)]"
        />
        <KPI
          label="Неликвид"
          value={summary.deadStockCount}
          sub={rub(summary.deadStockValue)}
          icon={<AlertTriangle size={16} />}
          color={
            summary.deadStockCount > 0
              ? "text-[var(--c-red)]"
              : "text-[var(--c-text2)]"
          }
        />
        <KPI
          label="Стоимость запасов"
          value={rub(summary.totalInventoryValue)}
          sub={`${metrics.length} SKU`}
          icon={<DollarSign size={16} />}
          color="text-[var(--c-text)]"
        />
      </div>

      {/* ================================================================== */}
      {/* TURNOVER TABLE                                                       */}
      {/* ================================================================== */}
      <div className="overflow-hidden rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)]">
        <div className="border-b border-[var(--c-border)] px-5 py-4">
          <h3 className="text-sm font-semibold text-[var(--c-text)]">
            Оборачиваемость по товарам
          </h3>
          <p className="mt-0.5 text-xs text-[var(--c-text3)]">
            Нажмите на заголовок колонки для сортировки
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--c-border)]">
                <th className="px-5 py-3 text-left text-xs font-medium text-[var(--c-text2)]">
                  <button
                    onClick={() => toggleSort("name")}
                    className="flex items-center gap-1.5 hover:text-[var(--c-text)] transition"
                  >
                    Товар
                    <SortIcon col="name" sortKey={sortKey} sortDir={sortDir} />
                  </button>
                </th>
                <th className="px-5 py-3 text-right text-xs font-medium text-[var(--c-text2)]">
                  <button
                    onClick={() => toggleSort("velocity")}
                    className="flex items-center justify-end gap-1.5 w-full hover:text-[var(--c-text)] transition"
                  >
                    Продажи/день
                    <SortIcon col="velocity" sortKey={sortKey} sortDir={sortDir} />
                  </button>
                </th>
                <th className="px-5 py-3 text-right text-xs font-medium text-[var(--c-text2)]">
                  <button
                    onClick={() => toggleSort("turnover")}
                    className="flex items-center justify-end gap-1.5 w-full hover:text-[var(--c-text)] transition"
                  >
                    Дней оборота
                    <SortIcon col="turnover" sortKey={sortKey} sortDir={sortDir} />
                  </button>
                </th>
                <th className="px-5 py-3 text-right text-xs font-medium text-[var(--c-text2)]">
                  <button
                    onClick={() => toggleSort("daysOfStock")}
                    className="flex items-center justify-end gap-1.5 w-full hover:text-[var(--c-text)] transition"
                  >
                    Дни запаса
                    <SortIcon col="daysOfStock" sortKey={sortKey} sortDir={sortDir} />
                  </button>
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-[var(--c-text2)]">
                  Рекомендация
                </th>
              </tr>
            </thead>
            <tbody>
              {displayedMetrics.map((m) => {
                const days =
                  m.daysOfInventory === Infinity
                    ? Infinity
                    : Math.round(m.daysOfInventory);
                // turnover days = windowDays / velocity (avoid /0)
                const turnoverDays =
                  m.salesVelocity > 0
                    ? Math.round(windowDays / m.salesVelocity)
                    : null;
                const availStock = getAvailableStock(m.product);

                return (
                  <tr
                    key={m.product.id}
                    className="border-b border-[var(--c-border)] last:border-0 transition hover:bg-[var(--c-bg3)]"
                  >
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium text-[var(--c-text)]">
                        {m.product.name}
                      </p>
                      <p className="text-xs text-[var(--c-text3)]">
                        {m.product.sku} · {m.product.category}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-right tabular">
                      <p className="text-sm font-medium text-[var(--c-text)]">
                        {m.salesVelocity > 0
                          ? (Math.round(m.salesVelocity * 10) / 10).toFixed(1)
                          : "—"}
                      </p>
                      <p className="text-xs text-[var(--c-text3)]">
                        {m.unitsSold} шт за {windowDays}д
                      </p>
                    </td>
                    <td className="px-5 py-3 text-right tabular">
                      <p className="text-sm font-medium text-[var(--c-text)]">
                        {turnoverDays !== null ? `${turnoverDays}д` : "—"}
                      </p>
                      {m.turnoverRatio > 0 && (
                        <p className="text-xs text-[var(--c-text3)]">
                          {m.turnoverRatio.toFixed(1)}× в год
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <p
                        className={cn(
                          "text-base font-bold tabular",
                          days === Infinity
                            ? "text-[var(--c-text3)]"
                            : daysColor(days),
                        )}
                      >
                        {days === Infinity ? "∞" : `${days}д`}
                      </p>
                      <p className="text-xs text-[var(--c-text3)]">
                        {availStock} шт
                      </p>
                    </td>
                    <td className="px-5 py-3">
                      {days === Infinity ? (
                        <span className="text-xs text-[var(--c-text3)]">
                          Нет продаж
                        </span>
                      ) : (
                        <span
                          className={cn(
                            "inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-medium whitespace-nowrap",
                            daysBg(days),
                            days < 7
                              ? "text-[var(--c-red)]"
                              : days <= 30
                                ? "text-[var(--c-amber)]"
                                : days > 90
                                  ? "text-[var(--c-blue)]"
                                  : "text-[var(--c-green)]",
                          )}
                        >
                          {daysLabel(days)}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {sortedMetrics.length > 15 && (
          <div className="border-t border-[var(--c-border)] px-5 py-3 text-center">
            <button
              onClick={() => setShowAll((v) => !v)}
              className="text-xs font-medium text-[var(--c-text2)] hover:text-[var(--c-text)] transition"
            >
              {showAll
                ? "Свернуть"
                : `Показать все ${sortedMetrics.length} товаров`}
            </button>
          </div>
        )}
      </div>

      {/* ================================================================== */}
      {/* CATEGORY CHART                                                       */}
      {/* ================================================================== */}
      <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-5">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp size={15} className="text-[var(--c-text2)]" />
          <h3 className="text-sm font-semibold text-[var(--c-text)]">
            Средние продажи по категориям
          </h3>
          <span className="ml-auto text-xs text-[var(--c-text3)]">
            ед./день
          </span>
        </div>
        {barChartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10">
            <Package size={28} className="mb-2 text-[var(--c-text3)]" />
            <p className="text-xs text-[var(--c-text3)]">
              Нет данных о продажах
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={barChartData}
              margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
              barSize={28}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--c-border)"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "var(--c-text3)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--c-text3)" }}
                axisLine={false}
                tickLine={false}
                width={32}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--c-bg2)",
                  border: "1px solid var(--c-border)",
                  borderRadius: 8,
                  color: "var(--c-text)",
                  fontSize: 12,
                }}
                formatter={(value, _name, props) => [
                  `${Number(value).toFixed(2)} ед./день · ${(props.payload as { count: number }).count} SKU`,
                  (props.payload as { fullName: string }).fullName,
                ]}
                labelFormatter={() => ""}
              />
              <Bar dataKey="velocity" radius={[4, 4, 0, 0]}>
                {barChartData.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={
                      entry.velocity > 2
                        ? "var(--c-green)"
                        : entry.velocity > 0.5
                          ? "var(--c-amber)"
                          : "var(--c-text3)"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
        {/* Category summary table */}
        {categoryRows.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {categoryRows.map((row) => (
              <div
                key={row.category}
                className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] px-3 py-2"
              >
                <p className="truncate text-xs font-medium text-[var(--c-text)]">
                  {row.category}
                </p>
                <p className="mt-0.5 text-xs text-[var(--c-text3)]">
                  {(Math.round(row.avgVelocity * 100) / 100).toFixed(2)} ед./день
                </p>
                <p className="text-xs text-[var(--c-text3)]">
                  Запас:{" "}
                  <span
                    className={cn(
                      "font-medium",
                      row.avgDays === 0
                        ? "text-[var(--c-text3)]"
                        : daysColor(row.avgDays),
                    )}
                  >
                    {row.avgDays > 0 ? `~${Math.round(row.avgDays)}д` : "∞"}
                  </span>
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ================================================================== */}
      {/* ABC DISTRIBUTION                                                     */}
      {/* ================================================================== */}
      <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-5">
        <div className="mb-4 flex items-center gap-2">
          <Layers size={15} className="text-[var(--c-text2)]" />
          <h3 className="text-sm font-semibold text-[var(--c-text)]">
            ABC-классификация по стоимости запасов
          </h3>
        </div>
        <div className="mb-4 flex h-3 overflow-hidden rounded-full bg-[var(--c-bg3)]">
          {(["A", "B", "C"] as ABCClass[]).map((cls) => {
            const pct = (summary.abcCounts[cls] / abcTotal) * 100;
            if (pct === 0) return null;
            return (
              <div
                key={cls}
                className={cn("h-full", ABC_META[cls].bg)}
                style={{ width: `${pct}%` }}
              />
            );
          })}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {(["A", "B", "C"] as ABCClass[]).map((cls) => (
            <div
              key={cls}
              className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] p-3"
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold text-[var(--c-bg)]",
                    ABC_META[cls].bg,
                  )}
                >
                  {ABC_META[cls].label}
                </span>
                <span className="text-sm font-semibold text-[var(--c-text)]">
                  {summary.abcCounts[cls]} SKU
                </span>
              </div>
              <p className="mt-1.5 text-xs text-[var(--c-text3)]">
                {ABC_META[cls].desc}
              </p>
              <p className="mt-1 text-xs font-medium text-[var(--c-text2)]">
                {rub(summary.abcValue[cls])}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ================================================================== */}
      {/* LEADERS / LAGGARDS                                                   */}
      {/* ================================================================== */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RankList
          title="Лидеры оборачиваемости"
          icon={<TrendingUp size={15} className="text-[var(--c-green)]" />}
          rows={leaders}
          kind="leader"
        />
        <RankList
          title="Медленные товары"
          icon={<TrendingDown size={15} className="text-[var(--c-amber)]" />}
          rows={laggards}
          kind="laggard"
        />
      </div>

      {/* ================================================================== */}
      {/* DEAD STOCK                                                           */}
      {/* ================================================================== */}
      <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-5">
        <div className="mb-4 flex items-center gap-2">
          <AlertTriangle size={15} className="text-[var(--c-red)]" />
          <h3 className="text-sm font-semibold text-[var(--c-text)]">
            Неликвид (нет продаж 60+ дней)
          </h3>
        </div>
        {deadStock.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Package size={32} className="mb-2 text-[var(--c-text3)]" />
            <p className="text-sm text-[var(--c-text2)]">
              Неликвидных товаров не обнаружено
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {deadStock.map((m) => (
              <div
                key={m.product.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] px-4 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--c-text)]">
                    {m.product.name}
                  </p>
                  <p className="text-xs text-[var(--c-text3)]">
                    {m.product.sku} · {m.product.totalPhysical} шт на складе
                    {m.lastSaleDaysAgo !== null
                      ? ` · последняя продажа ${m.lastSaleDaysAgo} дн. назад`
                      : " · продаж не было"}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-[var(--c-red)] tabular">
                  {rub(m.inventoryValue)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function KPI({
  label,
  value,
  sub,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
      <div className={cn("mb-2", color)}>{icon}</div>
      <p className="text-xs text-[var(--c-text2)]">{label}</p>
      <p className={cn("mt-0.5 text-xl font-bold tabular", color)}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-[var(--c-text3)]">{sub}</p>}
    </div>
  );
}

function RankList({
  title,
  icon,
  rows,
  kind,
}: {
  title: string;
  icon: React.ReactNode;
  rows: ProductMetrics[];
  kind: "leader" | "laggard";
}) {
  return (
    <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-5">
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-semibold text-[var(--c-text)]">{title}</h3>
      </div>
      {rows.length === 0 ? (
        <p className="py-4 text-center text-sm text-[var(--c-text3)]">
          Недостаточно данных о продажах
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((m) => (
            <div
              key={m.product.id}
              className="flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm text-[var(--c-text)]">
                  {m.product.name}
                </p>
                <p className="text-xs text-[var(--c-text3)]">
                  {m.daysOfInventory === Infinity
                    ? "∞ дней запаса"
                    : `${Math.round(m.daysOfInventory)} дн. запаса`}{" "}
                  · продано {m.unitsSold} шт
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 text-sm font-semibold tabular",
                  kind === "leader"
                    ? "text-[var(--c-green)]"
                    : "text-[var(--c-amber)]",
                )}
              >
                {m.turnoverRatio.toFixed(1)}×
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
