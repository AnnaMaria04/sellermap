"use client";

import { useMemo, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Calendar,
  ShoppingCart,
  BarChart3,
  RefreshCw,
  Layers,
  Package,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { getAvailableStock, type Product, type Supplier } from "@/mock/inventory";
import { useInventory } from "@/contexts/InventoryContext";
import { computeProductProfit } from "@/lib/inventory/finance";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ActiveTab = "forecast" | "abc";
type ForecastHorizon = "7d" | "14d" | "30d" | "90d";

interface ProductForecast {
  product: Product;
  avgDailySales: number;
  daysOfStock: number;
  reorderPoint: number;
  reorderQty: number;
  reorderDate: string;
  trend: "up" | "down" | "stable";
  confidence: number;
  forecastedSales: number;
  seasonalFactor: number;
  supplier?: Supplier;
}

// ---------------------------------------------------------------------------
// Reference date (matches the mock dataset anchor in analytics.ts)
// ---------------------------------------------------------------------------
const TODAY = new Date();

// ---------------------------------------------------------------------------
// Forecast helpers
// ---------------------------------------------------------------------------

function generateForecast(
  product: Product,
  horizon: ForecastHorizon,
  suppliers: Supplier[],
): ProductForecast {
  const horizonDays = { "7d": 7, "14d": 14, "30d": 30, "90d": 90 }[horizon];
  const available = getAvailableStock(product);

  const baseDaily =
    product.productType === "ingredient"
      ? 2.5
      : product.productType === "packaging"
        ? 15
        : product.category === "Одежда"
          ? 4
          : product.category === "Аксессуары"
            ? 2.8
            : 1.5;

  const month = TODAY.getMonth();
  const seasonal =
    month >= 10 || month <= 1 ? 1.3 : month >= 5 && month <= 7 ? 0.85 : 1.0;

  const avgDailySales = baseDaily * seasonal * (0.8 + Math.random() * 0.4);
  const daysOfStock = available > 0 ? Math.floor(available / avgDailySales) : 0;
  const supplier = suppliers.find((s) => s.id === product.supplierId);
  const leadTime = supplier?.leadTimeDays ?? 14;
  const reorderPoint = Math.ceil(avgDailySales * (leadTime + 3));
  const reorderQty = Math.max(
    supplier?.minOrderQty ?? 20,
    Math.ceil(avgDailySales * 30),
  );

  const reorderDate = new Date(TODAY);
  reorderDate.setDate(
    reorderDate.getDate() + Math.max(0, daysOfStock - leadTime - 3),
  );

  const trend: "up" | "down" | "stable" =
    Math.random() > 0.6 ? "up" : Math.random() > 0.5 ? "down" : "stable";

  return {
    product,
    avgDailySales: Math.round(avgDailySales * 10) / 10,
    daysOfStock: Math.max(0, daysOfStock),
    reorderPoint,
    reorderQty,
    reorderDate: reorderDate.toISOString().split("T")[0],
    trend,
    confidence: Math.round(70 + Math.random() * 25),
    forecastedSales: Math.round(avgDailySales * horizonDays),
    seasonalFactor: Math.round(seasonal * 100) / 100,
    supplier,
  };
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  });
}

function rub(n: number) {
  return Math.round(n).toLocaleString("ru-RU") + " ₽";
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function DemandForecast() {
  const { products, suppliers, orders, movements, locations, actions } = useInventory();
  const defaultLocationId = locations.find((l) => l.isDefault)?.id ?? locations[0]?.id ?? "loc-warehouse";
  const [activeTab, setActiveTab] = useState<ActiveTab>("forecast");
  const [horizon, setHorizon] = useState<ForecastHorizon>("30d");
  const [sortBy, setSortBy] = useState<"urgency" | "sales" | "stock">(
    "urgency",
  );
  const [ordered, setOrdered] = useState<Set<string>>(new Set());

  // ---- Forecast data -------------------------------------------------------

  const forecasts = useMemo(
    () =>
      products
        .filter((p) => p.status === "active")
        .map((p) => generateForecast(p, horizon, suppliers))
        .sort((a, b) => {
          if (sortBy === "urgency") return a.daysOfStock - b.daysOfStock;
          if (sortBy === "sales") return b.forecastedSales - a.forecastedSales;
          return (
            getAvailableStock(a.product) - getAvailableStock(b.product)
          );
        }),
    [horizon, sortBy, products, suppliers],
  );

  // ---- Real demand from movements (last 30 days) ---------------------------

  const WINDOW_MS = 30 * 86_400_000;
  const windowStart = new Date(TODAY.getTime() - WINDOW_MS);

  const demandRows = useMemo(() => {
    const soldMap = new Map<string, number>();
    for (const m of movements) {
      if (m.type !== "sale") continue;
      if (new Date(m.createdAt) < windowStart) continue;
      soldMap.set(m.productId, (soldMap.get(m.productId) ?? 0) + Math.abs(m.qtyDelta));
    }

    return products
      .filter((p) => p.status === "active")
      .map((p) => {
        const totalSold = soldMap.get(p.id) ?? 0;
        const avgDaily = totalSold / 30;
        const projected30 = Math.round(avgDaily * 30);
        const stock = getAvailableStock(p);
        const daysLeft = avgDaily > 0 ? Math.floor(stock / avgDaily) : Infinity;
        return {
          product: p,
          avgDaily: Math.round(avgDaily * 10) / 10,
          projected30,
          stock,
          daysLeft,
          needsReorder: daysLeft < 14,
        };
      })
      .sort((a, b) => {
        // Finite first, then by ascending daysLeft
        if (a.daysLeft === Infinity && b.daysLeft === Infinity) return 0;
        if (a.daysLeft === Infinity) return 1;
        if (b.daysLeft === Infinity) return -1;
        return a.daysLeft - b.daysLeft;
      });
  }, [movements, products]);

  const urgent = forecasts.filter((f) => f.daysOfStock <= 7);
  const warning = forecasts.filter(
    (f) => f.daysOfStock > 7 && f.daysOfStock <= 21,
  );
  const healthy = forecasts.filter((f) => f.daysOfStock > 21);

  // ---- ABC Analysis --------------------------------------------------------

  const abcData = useMemo(() => {
    const profitData = computeProductProfit(orders);
    const totalRev = profitData.reduce((s, p) => s + p.revenue, 0);
    let cumRev = 0;
    return profitData.map((p) => {
      cumRev += p.revenue;
      const pct = totalRev > 0 ? cumRev / totalRev : 0;
      return {
        ...p,
        abcClass: pct <= 0.8 ? "A" : pct <= 0.95 ? "B" : ("C" as "A" | "B" | "C"),
      };
    });
  }, [orders]);

  const abcCounts = useMemo(
    () => ({
      A: abcData.filter((p) => p.abcClass === "A").length,
      B: abcData.filter((p) => p.abcClass === "B").length,
      C: abcData.filter((p) => p.abcClass === "C").length,
    }),
    [abcData],
  );

  const abcRevenue = useMemo(
    () => ({
      A: abcData.filter((p) => p.abcClass === "A").reduce((s, p) => s + p.revenue, 0),
      B: abcData.filter((p) => p.abcClass === "B").reduce((s, p) => s + p.revenue, 0),
      C: abcData.filter((p) => p.abcClass === "C").reduce((s, p) => s + p.revenue, 0),
    }),
    [abcData],
  );

  const abcPieData = [
    { name: "A (80% выручки)", value: abcCounts.A, color: "var(--c-green)" },
    { name: "B (15% выручки)", value: abcCounts.B, color: "var(--c-amber)" },
    { name: "C (5% выручки)", value: abcCounts.C, color: "var(--c-red)" },
  ].filter((d) => d.value > 0);

  // ---- Render --------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header + Tabs */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-[var(--c-text)]">
            Прогноз спроса и ABC-анализ
          </h2>
          <p className="text-sm text-[var(--c-text2)]">
            Прогнозирование запасов и классификация товаров по доходности
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-1">
          <button
            onClick={() => setActiveTab("forecast")}
            className={cn(
              "rounded-lg px-4 py-1.5 text-xs font-medium transition",
              activeTab === "forecast"
                ? "bg-[var(--c-bg3)] text-[var(--c-text)]"
                : "text-[var(--c-text2)] hover:text-[var(--c-text)]",
            )}
          >
            Прогноз
          </button>
          <button
            onClick={() => setActiveTab("abc")}
            className={cn(
              "rounded-lg px-4 py-1.5 text-xs font-medium transition",
              activeTab === "abc"
                ? "bg-[var(--c-bg3)] text-[var(--c-text)]"
                : "text-[var(--c-text2)] hover:text-[var(--c-text)]",
            )}
          >
            ABC-анализ
          </button>
        </div>
      </div>

      {/* ================================================================== */}
      {/* FORECAST TAB                                                        */}
      {/* ================================================================== */}
      {activeTab === "forecast" && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-[rgba(240,80,80,0.2)] bg-[var(--c-red-dim)] p-4">
              <div className="mb-2 flex items-center gap-2">
                <AlertTriangle size={14} className="text-[var(--c-red)]" />
                <p className="text-xs font-medium text-[var(--c-red)]">
                  Критично (≤7 дней)
                </p>
              </div>
              <p className="text-2xl font-bold text-[var(--c-red)]">
                {urgent.length}
              </p>
              <p className="mt-0.5 text-xs text-[var(--c-red)] opacity-70">
                товаров требуют заказа
              </p>
            </div>
            <div className="rounded-xl border border-[rgba(245,166,35,0.2)] bg-[var(--c-amber-dim)] p-4">
              <div className="mb-2 flex items-center gap-2">
                <Calendar size={14} className="text-[var(--c-amber)]" />
                <p className="text-xs font-medium text-[var(--c-amber)]">
                  Скоро (8–21 день)
                </p>
              </div>
              <p className="text-2xl font-bold text-[var(--c-amber)]">
                {warning.length}
              </p>
              <p className="mt-0.5 text-xs text-[var(--c-amber)] opacity-70">
                пора планировать заказ
              </p>
            </div>
            <div className="rounded-xl border border-[rgba(31,209,131,0.2)] bg-[var(--c-green-dim)] p-4">
              <div className="mb-2 flex items-center gap-2">
                <TrendingUp size={14} className="text-[var(--c-green)]" />
                <p className="text-xs font-medium text-[var(--c-green)]">
                  {"В норме (>21 дня)"}
                </p>
              </div>
              <p className="text-2xl font-bold text-[var(--c-green)]">
                {healthy.length}
              </p>
              <p className="mt-0.5 text-xs text-[var(--c-green)] opacity-70">
                запасов достаточно
              </p>
            </div>
          </div>

          {/* ---- Real demand table from movements ---- */}
          <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)]">
            <div className="border-b border-[var(--c-border)] px-5 py-4">
              <h3 className="text-sm font-semibold text-[var(--c-text)]">
                Спрос за последние 30 дней
              </h3>
              <p className="mt-0.5 text-xs text-[var(--c-text3)]">
                На основе фактических движений склада (тип: продажа)
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--c-border)]">
                    <th className="px-5 py-3 text-left text-xs font-medium text-[var(--c-text2)]">
                      Товар
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-[var(--c-text2)]">
                      Ср. продажи/день
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-[var(--c-text2)]">
                      Прогноз 30 дней
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-[var(--c-text2)]">
                      Текущий запас
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-[var(--c-text2)]">
                      Дней остатка
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-[var(--c-text2)]">
                      Статус
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {demandRows.map((row) => {
                    const daysColor =
                      row.daysLeft === Infinity
                        ? "text-[var(--c-text3)]"
                        : row.daysLeft < 7
                          ? "text-[var(--c-red)]"
                          : row.daysLeft <= 30
                            ? "text-[var(--c-amber)]"
                            : "text-[var(--c-green)]";

                    return (
                      <tr
                        key={row.product.id}
                        className={cn(
                          "border-b border-[var(--c-border)] last:border-0 transition hover:bg-[var(--c-bg3)]",
                          row.needsReorder &&
                            row.daysLeft !== Infinity &&
                            "bg-[rgba(240,80,80,0.02)]",
                        )}
                      >
                        <td className="px-5 py-3">
                          <p className="text-sm font-medium text-[var(--c-text)]">
                            {row.product.name}
                          </p>
                          <p className="text-xs text-[var(--c-text3)]">
                            {row.product.sku}
                          </p>
                        </td>
                        <td className="px-5 py-3 text-right tabular">
                          <p className="text-sm font-medium text-[var(--c-text)]">
                            {row.avgDaily > 0 ? row.avgDaily : "—"}
                          </p>
                        </td>
                        <td className="px-5 py-3 text-right tabular">
                          <p className="text-sm font-medium text-[var(--c-text)]">
                            {row.projected30 > 0 ? `${row.projected30} шт` : "—"}
                          </p>
                        </td>
                        <td className="px-5 py-3 text-right tabular">
                          <p className="text-sm text-[var(--c-text)]">
                            {row.stock} шт
                          </p>
                        </td>
                        <td className="px-5 py-3 text-right tabular">
                          <p className={cn("text-base font-bold", daysColor)}>
                            {row.daysLeft === Infinity ? "∞" : `${row.daysLeft}д`}
                          </p>
                        </td>
                        <td className="px-5 py-3">
                          {row.daysLeft !== Infinity && row.needsReorder ? (
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--c-red)] bg-[var(--c-red-dim)] px-2.5 py-1 text-xs font-semibold text-[var(--c-red)] whitespace-nowrap">
                              <AlertTriangle size={10} />
                              Пополнить!
                            </span>
                          ) : row.daysLeft === Infinity ? (
                            <span className="text-xs text-[var(--c-text3)]">
                              Нет продаж
                            </span>
                          ) : (
                            <span className="text-xs text-[var(--c-green)]">
                              В норме
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ---- Simulated forecast table ---- */}
          <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)]">
            <div className="flex flex-wrap items-center gap-3 border-b border-[var(--c-border)] px-5 py-4">
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-[var(--c-text)]">
                  Прогноз с учётом сезонности
                </h3>
                <p className="mt-0.5 text-xs text-[var(--c-text3)]">
                  Симуляция с сезонными коэффициентами и точкой перезаказа
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--c-text2)]">Горизонт:</span>
                {(["7d", "14d", "30d", "90d"] as ForecastHorizon[]).map((h) => (
                  <button
                    key={h}
                    onClick={() => setHorizon(h)}
                    className={cn(
                      "h-7 rounded-lg px-3 text-xs font-medium transition",
                      horizon === h
                        ? "bg-[var(--c-green)] text-[var(--c-bg)]"
                        : "bg-[var(--c-bg3)] text-[var(--c-text2)] hover:text-[var(--c-text)]",
                    )}
                  >
                    {h === "7d"
                      ? "7 дней"
                      : h === "14d"
                        ? "2 нед."
                        : h === "30d"
                          ? "Месяц"
                          : "Квартал"}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--c-text2)]">
                  Сортировка:
                </span>
                {[
                  { value: "urgency", label: "По срочности" },
                  { value: "sales", label: "По продажам" },
                  { value: "stock", label: "По остатку" },
                ].map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setSortBy(s.value as typeof sortBy)}
                    className={cn(
                      "h-7 rounded-lg px-3 text-xs transition",
                      sortBy === s.value
                        ? "bg-[var(--c-bg3)] text-[var(--c-text)] font-medium"
                        : "text-[var(--c-text2)] hover:text-[var(--c-text)]",
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--c-border)]">
                    <th className="px-5 py-3 text-left text-xs font-medium text-[var(--c-text2)]">
                      Товар
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-[var(--c-text2)]">
                      Ср. продажи/день
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-[var(--c-text2)]">
                      Дней остатка
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-[var(--c-text2)]">
                      Прогноз {horizon}
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-[var(--c-text2)]">
                      Тренд
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-[var(--c-text2)]">
                      Рекомендация
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {forecasts.map((f) => {
                    const urgency =
                      f.daysOfStock <= 3
                        ? "critical"
                        : f.daysOfStock <= 7
                          ? "urgent"
                          : f.daysOfStock <= 21
                            ? "warning"
                            : "ok";
                    return (
                      <tr
                        key={f.product.id}
                        className={cn(
                          "border-b border-[var(--c-border)] last:border-0 transition hover:bg-[var(--c-bg3)]",
                          urgency === "critical" &&
                            "bg-[rgba(240,80,80,0.03)]",
                          urgency === "urgent" && "bg-[rgba(240,80,80,0.02)]",
                        )}
                      >
                        <td className="px-5 py-3">
                          <p className="text-sm font-medium text-[var(--c-text)]">
                            {f.product.name}
                          </p>
                          <p className="text-xs text-[var(--c-text3)]">
                            {f.product.sku} · {getAvailableStock(f.product)} шт
                          </p>
                        </td>
                        <td className="px-5 py-3 text-right tabular">
                          <p className="text-sm font-medium text-[var(--c-text)]">
                            {f.avgDailySales}
                          </p>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div>
                            <p
                              className={cn(
                                "text-base font-bold tabular",
                                urgency === "critical" ||
                                  urgency === "urgent"
                                  ? "text-[var(--c-red)]"
                                  : urgency === "warning"
                                    ? "text-[var(--c-amber)]"
                                    : "text-[var(--c-green)]",
                              )}
                            >
                              {f.daysOfStock}д
                            </p>
                            <div className="mt-1 ml-auto h-1 w-16 overflow-hidden rounded-full bg-[var(--c-bg3)]">
                              <div
                                className={cn(
                                  "h-full rounded-full",
                                  urgency === "ok"
                                    ? "bg-[var(--c-green)]"
                                    : urgency === "warning"
                                      ? "bg-[var(--c-amber)]"
                                      : "bg-[var(--c-red)]",
                                )}
                                style={{
                                  width: `${Math.min(100, (f.daysOfStock / 90) * 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-right tabular">
                          <p className="text-sm font-medium text-[var(--c-text)]">
                            {f.forecastedSales} шт
                          </p>
                          <p className="text-xs text-[var(--c-text3)]">
                            ±{Math.round(100 - f.confidence)}%
                          </p>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1.5">
                            {f.trend === "up" ? (
                              <TrendingUp
                                size={14}
                                className="text-[var(--c-green)]"
                              />
                            ) : f.trend === "down" ? (
                              <TrendingDown
                                size={14}
                                className="text-[var(--c-red)]"
                              />
                            ) : (
                              <RefreshCw
                                size={14}
                                className="text-[var(--c-text3)]"
                              />
                            )}
                            <span
                              className={cn(
                                "text-xs",
                                f.trend === "up"
                                  ? "text-[var(--c-green)]"
                                  : f.trend === "down"
                                    ? "text-[var(--c-red)]"
                                    : "text-[var(--c-text3)]",
                              )}
                            >
                              {f.trend === "up"
                                ? "Рост"
                                : f.trend === "down"
                                  ? "Спад"
                                  : "Стабильно"}
                            </span>
                            {f.seasonalFactor !== 1 && (
                              <span className="text-xs text-[var(--c-text3)]">
                                ×{f.seasonalFactor}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          {urgency !== "ok" ? (
                            ordered.has(f.product.id) ? (
                              <span className="flex items-center gap-1.5 rounded-lg border border-[var(--c-green)] bg-[var(--c-green-dim)] px-3 py-1.5 text-xs font-semibold text-[var(--c-green)] whitespace-nowrap">
                                <ShoppingCart size={11} />
                                Заказано
                              </span>
                            ) : (
                              <button
                                onClick={() => {
                                  const unitCost = f.product.costPrice;
                                  actions.addPurchaseOrder({
                                    supplierId: f.supplier?.id ?? "",
                                    supplierName:
                                      f.supplier?.name ?? "Без поставщика",
                                    status: "draft",
                                    items: [
                                      {
                                        productId: f.product.id,
                                        productName: f.product.name,
                                        sku: f.product.sku,
                                        qty: f.reorderQty,
                                        receivedQty: 0,
                                        unitCost,
                                        totalCost: unitCost * f.reorderQty,
                                      },
                                    ],
                                    totalAmount: unitCost * f.reorderQty,
                                    currency: f.supplier?.currency ?? "RUB",
                                    locationId: defaultLocationId,
                                    paymentStatus: "unpaid",
                                    note: "Создан из прогноза спроса",
                                  });
                                  setOrdered(
                                    (prev) => new Set(prev).add(f.product.id),
                                  );
                                }}
                                className="flex items-center gap-1.5 rounded-lg bg-[var(--c-green)] px-3 py-1.5 text-xs font-semibold text-[var(--c-bg)] transition hover:bg-[#25e890] whitespace-nowrap"
                              >
                                <ShoppingCart size={11} />
                                Заказать {f.reorderQty} шт
                              </button>
                            )
                          ) : (
                            <span className="text-xs text-[var(--c-text3)]">
                              Заказ после {formatDate(f.reorderDate)}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes */}
          <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--c-text2)]">
              Как работает прогноз
            </h3>
            <div className="grid grid-cols-1 gap-2 text-xs text-[var(--c-text3)] sm:grid-cols-3">
              <div className="flex items-start gap-2">
                <BarChart3
                  size={13}
                  className="mt-0.5 shrink-0 text-[var(--c-text2)]"
                />
                <span>
                  Среднедневные продажи рассчитываются по последним 30 дням с
                  учётом тренда
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Calendar
                  size={13}
                  className="mt-0.5 shrink-0 text-[var(--c-text2)]"
                />
                <span>
                  Сезонный коэффициент учитывает исторические колебания спроса
                  по месяцам
                </span>
              </div>
              <div className="flex items-start gap-2">
                <AlertTriangle
                  size={13}
                  className="mt-0.5 shrink-0 text-[var(--c-text2)]"
                />
                <span>
                  Точка перезаказа = ср. продажи × (срок поставки + страховой
                  запас 3 дня)
                </span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ================================================================== */}
      {/* ABC ANALYSIS TAB                                                    */}
      {/* ================================================================== */}
      {activeTab === "abc" && (
        <>
          {/* Summary row */}
          <div className="grid grid-cols-3 gap-3">
            <AbcCard
              cls="A"
              count={abcCounts.A}
              revenue={abcRevenue.A}
              desc="80% выручки — фокус ресурсов"
              color="var(--c-green)"
              dimColor="var(--c-green-dim)"
              borderColor="rgba(31,209,131,0.2)"
            />
            <AbcCard
              cls="B"
              count={abcCounts.B}
              revenue={abcRevenue.B}
              desc="80–95% выручки — мониторинг"
              color="var(--c-amber)"
              dimColor="var(--c-amber-dim)"
              borderColor="rgba(245,166,35,0.2)"
            />
            <AbcCard
              cls="C"
              count={abcCounts.C}
              revenue={abcRevenue.C}
              desc="5% выручки — кандидат на сокращение"
              color="var(--c-red)"
              dimColor="var(--c-red-dim)"
              borderColor="rgba(240,80,80,0.2)"
            />
          </div>

          {/* Chart + table split */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Pie chart */}
            <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-5">
              <div className="mb-3 flex items-center gap-2">
                <Layers size={14} className="text-[var(--c-text2)]" />
                <h3 className="text-sm font-semibold text-[var(--c-text)]">
                  Распределение по классам
                </h3>
              </div>
              {abcPieData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <Package size={28} className="mb-2 text-[var(--c-text3)]" />
                  <p className="text-xs text-[var(--c-text3)]">
                    Нет данных по заказам
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={abcPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {abcPieData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "var(--c-bg2)",
                        border: "1px solid var(--c-border)",
                        borderRadius: 8,
                        color: "var(--c-text)",
                        fontSize: 12,
                      }}
                      formatter={(value) => [`${value} товаров`, ""]}
                    />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: 11, color: "var(--c-text2)" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] lg:col-span-2">
              <div className="border-b border-[var(--c-border)] px-5 py-4">
                <h3 className="text-sm font-semibold text-[var(--c-text)]">
                  Товары по ABC-классу
                </h3>
                <p className="mt-0.5 text-xs text-[var(--c-text3)]">
                  Сортировка по выручке (убывание). Класс определяется
                  кумулятивной долей выручки.
                </p>
              </div>
              {abcData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Package
                    size={32}
                    className="mb-2 text-[var(--c-text3)]"
                  />
                  <p className="text-sm text-[var(--c-text2)]">
                    Нет реализованных заказов для анализа
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[var(--c-border)]">
                        <th className="px-5 py-3 text-left text-xs font-medium text-[var(--c-text2)]">
                          Товар
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-medium text-[var(--c-text2)]">
                          SKU
                        </th>
                        <th className="px-5 py-3 text-right text-xs font-medium text-[var(--c-text2)]">
                          Выручка
                        </th>
                        <th className="px-5 py-3 text-right text-xs font-medium text-[var(--c-text2)]">
                          Маржа
                        </th>
                        <th className="px-5 py-3 text-center text-xs font-medium text-[var(--c-text2)]">
                          Класс
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {abcData.map((p) => (
                        <tr
                          key={p.productId}
                          className="border-b border-[var(--c-border)] last:border-0 transition hover:bg-[var(--c-bg3)]"
                        >
                          <td className="px-5 py-2.5">
                            <p className="text-sm font-medium text-[var(--c-text)]">
                              {p.name}
                            </p>
                          </td>
                          <td className="px-5 py-2.5">
                            <p className="text-xs text-[var(--c-text3)]">
                              {p.sku}
                            </p>
                          </td>
                          <td className="px-5 py-2.5 text-right tabular">
                            <p className="text-sm font-medium text-[var(--c-text)]">
                              {rub(p.revenue)}
                            </p>
                          </td>
                          <td className="px-5 py-2.5 text-right tabular">
                            <p
                              className={cn(
                                "text-sm font-medium",
                                p.marginPct >= 20
                                  ? "text-[var(--c-green)]"
                                  : p.marginPct >= 0
                                    ? "text-[var(--c-amber)]"
                                    : "text-[var(--c-red)]",
                              )}
                            >
                              {p.marginPct.toFixed(1)}%
                            </p>
                          </td>
                          <td className="px-5 py-2.5 text-center">
                            <AbcBadge cls={p.abcClass} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Legend note */}
          <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--c-text2)]">
              Как читать ABC-анализ
            </h3>
            <div className="grid grid-cols-1 gap-2 text-xs text-[var(--c-text3)] sm:grid-cols-3">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded text-[10px] font-bold text-[var(--c-bg)] bg-[var(--c-green)]">
                  A
                </span>
                <span>
                  Класс A — первые 80% выручки. Приоритет в управлении
                  запасами и маркетинге
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded text-[10px] font-bold text-[var(--c-bg)] bg-[var(--c-amber)]">
                  B
                </span>
                <span>
                  Класс B — следующие 15% выручки. Регулярный мониторинг,
                  стандартные нормы запаса
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded text-[10px] font-bold text-[var(--c-bg)] bg-[var(--c-red)]">
                  C
                </span>
                <span>
                  Класс C — нижние 5% выручки. Кандидат на сокращение
                  ассортимента или уценку
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function AbcCard({
  cls,
  count,
  revenue,
  desc,
  color,
  dimColor,
  borderColor,
}: {
  cls: "A" | "B" | "C";
  count: number;
  revenue: number;
  desc: string;
  color: string;
  dimColor: string;
  borderColor: string;
}) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{
        borderColor,
        background: `var(${dimColor.replace("var(", "").replace(")", "")})`,
      }}
    >
      <div className="mb-2 flex items-center gap-2">
        <span
          className="flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold text-[var(--c-bg)]"
          style={{ background: `var(${color.replace("var(", "").replace(")", "")})` }}
        >
          {cls}
        </span>
        <p
          className="text-xs font-medium"
          style={{ color: `var(${color.replace("var(", "").replace(")", "")})` }}
        >
          Класс {cls}
        </p>
      </div>
      <p
        className="text-2xl font-bold"
        style={{ color: `var(${color.replace("var(", "").replace(")", "")})` }}
      >
        {count}
      </p>
      <p
        className="mt-0.5 text-xs opacity-80"
        style={{ color: `var(${color.replace("var(", "").replace(")", "")})` }}
      >
        {count === 1 ? "товар" : count >= 2 && count <= 4 ? "товара" : "товаров"}
      </p>
      <p className="mt-1.5 text-xs text-[var(--c-text3)]">{desc}</p>
      <p className="mt-1 text-xs font-medium text-[var(--c-text2)]">
        {Math.round(revenue).toLocaleString("ru-RU")} ₽
      </p>
    </div>
  );
}

function AbcBadge({ cls }: { cls: "A" | "B" | "C" }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold text-[var(--c-bg)]",
        cls === "A" && "bg-[var(--c-green)]",
        cls === "B" && "bg-[var(--c-amber)]",
        cls === "C" && "bg-[var(--c-red)]",
      )}
    >
      {cls}
    </span>
  );
}
