"use client";

import { useMemo, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Calendar,
  ShoppingCart,
  BarChart3,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { getAvailableStock, type Product, type Supplier } from "@/mock/inventory";
import { useInventory } from "@/contexts/InventoryContext";
import { cn } from "@/lib/utils";

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

// Simulated forecast data
function generateForecast(product: Product, horizon: ForecastHorizon, suppliers: Supplier[]): ProductForecast {
  const horizonDays = { "7d": 7, "14d": 14, "30d": 30, "90d": 90 }[horizon];
  const available = getAvailableStock(product);

  // Simulate average daily sales based on product type and stock level
  const baseDaily = product.productType === "ingredient" ? 2.5 :
    product.productType === "packaging" ? 15 :
    product.category === "Одежда" ? 4 :
    product.category === "Аксессуары" ? 2.8 : 1.5;

  // Simulate seasonal factor (peak season boost)
  const month = new Date().getMonth();
  const seasonal = month >= 10 || month <= 1 ? 1.3 : month >= 5 && month <= 7 ? 0.85 : 1.0;

  const avgDailySales = baseDaily * seasonal * (0.8 + Math.random() * 0.4);
  const daysOfStock = available > 0 ? Math.floor(available / avgDailySales) : 0;
  const supplier = suppliers.find((s) => s.id === product.supplierId);
  const leadTime = supplier?.leadTimeDays ?? 14;
  const reorderPoint = Math.ceil(avgDailySales * (leadTime + 3)); // safety stock
  const reorderQty = Math.max(supplier?.minOrderQty ?? 20, Math.ceil(avgDailySales * 30));

  const reorderDate = new Date();
  reorderDate.setDate(reorderDate.getDate() + Math.max(0, daysOfStock - leadTime - 3));

  const trend: "up" | "down" | "stable" = Math.random() > 0.6 ? "up" : Math.random() > 0.5 ? "down" : "stable";

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

export function DemandForecast() {
  const { products, suppliers } = useInventory();
  const [horizon, setHorizon] = useState<ForecastHorizon>("30d");
  const [sortBy, setSortBy] = useState<"urgency" | "sales" | "stock">("urgency");

  const forecasts = useMemo(
    () =>
      products.filter((p) => p.status === "active")
        .map((p) => generateForecast(p, horizon, suppliers))
        .sort((a, b) => {
          if (sortBy === "urgency") return a.daysOfStock - b.daysOfStock;
          if (sortBy === "sales") return b.forecastedSales - a.forecastedSales;
          return getAvailableStock(a.product) - getAvailableStock(b.product);
        }),
    [horizon, sortBy, products, suppliers],
  );

  const urgent = forecasts.filter((f) => f.daysOfStock <= 7);
  const warning = forecasts.filter((f) => f.daysOfStock > 7 && f.daysOfStock <= 21);
  const healthy = forecasts.filter((f) => f.daysOfStock > 21);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-[var(--c-text)]">Прогноз спроса</h2>
          <p className="text-sm text-[var(--c-text2)]">Прогноз на основе исторических продаж и сезонности</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--c-text2)]">Горизонт:</span>
          {(["7d", "14d", "30d", "90d"] as ForecastHorizon[]).map((h) => (
            <button
              key={h}
              onClick={() => setHorizon(h)}
              className={cn(
                "h-8 rounded-lg px-3 text-xs font-medium transition",
                horizon === h
                  ? "bg-[var(--c-green)] text-[var(--c-bg)]"
                  : "bg-[var(--c-bg3)] text-[var(--c-text2)] hover:text-[var(--c-text)]",
              )}
            >
              {h === "7d" ? "7 дней" : h === "14d" ? "2 нед." : h === "30d" ? "Месяц" : "Квартал"}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-[rgba(240,80,80,0.2)] bg-[var(--c-red-dim)] p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} className="text-[var(--c-red)]" />
            <p className="text-xs font-medium text-[var(--c-red)]">Критично (≤7 дней)</p>
          </div>
          <p className="text-2xl font-bold text-[var(--c-red)]">{urgent.length}</p>
          <p className="text-xs text-[var(--c-red)] opacity-70 mt-0.5">товаров требуют заказа</p>
        </div>
        <div className="rounded-xl border border-[rgba(245,166,35,0.2)] bg-[var(--c-amber-dim)] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={14} className="text-[var(--c-amber)]" />
            <p className="text-xs font-medium text-[var(--c-amber)]">Скоро (8–21 день)</p>
          </div>
          <p className="text-2xl font-bold text-[var(--c-amber)]">{warning.length}</p>
          <p className="text-xs text-[var(--c-amber)] opacity-70 mt-0.5">пора планировать заказ</p>
        </div>
        <div className="rounded-xl border border-[rgba(31,209,131,0.2)] bg-[var(--c-green-dim)] p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={14} className="text-[var(--c-green)]" />
            <p className="text-xs font-medium text-[var(--c-green)]">{"В норме (>21 дня)"}</p>
          </div>
          <p className="text-2xl font-bold text-[var(--c-green)]">{healthy.length}</p>
          <p className="text-xs text-[var(--c-green)] opacity-70 mt-0.5">запасов достаточно</p>
        </div>
      </div>

      {/* Sort */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-[var(--c-text2)]">Сортировка:</span>
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

      {/* Forecast table */}
      <div className="overflow-hidden rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--c-border)]">
                <th className="px-5 py-3 text-left text-xs font-medium text-[var(--c-text2)]">Товар</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-[var(--c-text2)]">Ср. продажи/день</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-[var(--c-text2)]">Дней остатка</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-[var(--c-text2)]">Прогноз {horizon}</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-[var(--c-text2)]">Тренд</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-[var(--c-text2)]">Рекомендация</th>
              </tr>
            </thead>
            <tbody>
              {forecasts.map((f) => {
                const urgency = f.daysOfStock <= 3 ? "critical" : f.daysOfStock <= 7 ? "urgent" : f.daysOfStock <= 21 ? "warning" : "ok";
                return (
                  <tr
                    key={f.product.id}
                    className={cn(
                      "border-b border-[var(--c-border)] last:border-0 hover:bg-[var(--c-bg3)] transition",
                      urgency === "critical" && "bg-[rgba(240,80,80,0.03)]",
                      urgency === "urgent" && "bg-[rgba(240,80,80,0.02)]",
                    )}
                  >
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium text-[var(--c-text)]">{f.product.name}</p>
                      <p className="text-xs text-[var(--c-text3)]">{f.product.sku} · {getAvailableStock(f.product)} шт</p>
                    </td>
                    <td className="px-5 py-3 text-right tabular">
                      <p className="text-sm font-medium text-[var(--c-text)]">{f.avgDailySales}</p>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div>
                        <p className={cn(
                          "text-base font-bold tabular",
                          urgency === "critical" ? "text-[var(--c-red)]" :
                          urgency === "urgent" ? "text-[var(--c-red)]" :
                          urgency === "warning" ? "text-[var(--c-amber)]" :
                          "text-[var(--c-green)]",
                        )}>
                          {f.daysOfStock}д
                        </p>
                        <div className="mt-1 w-16 h-1 rounded-full bg-[var(--c-bg3)] overflow-hidden ml-auto">
                          <div
                            className={cn("h-full rounded-full", urgency === "ok" ? "bg-[var(--c-green)]" : urgency === "warning" ? "bg-[var(--c-amber)]" : "bg-[var(--c-red)]")}
                            style={{ width: `${Math.min(100, (f.daysOfStock / 90) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right tabular">
                      <p className="text-sm font-medium text-[var(--c-text)]">{f.forecastedSales} шт</p>
                      <p className="text-xs text-[var(--c-text3)]">±{Math.round((100 - f.confidence))}%</p>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        {f.trend === "up" ? (
                          <TrendingUp size={14} className="text-[var(--c-green)]" />
                        ) : f.trend === "down" ? (
                          <TrendingDown size={14} className="text-[var(--c-red)]" />
                        ) : (
                          <RefreshCw size={14} className="text-[var(--c-text3)]" />
                        )}
                        <span className={cn(
                          "text-xs",
                          f.trend === "up" ? "text-[var(--c-green)]" :
                          f.trend === "down" ? "text-[var(--c-red)]" :
                          "text-[var(--c-text3)]",
                        )}>
                          {f.trend === "up" ? "Рост" : f.trend === "down" ? "Спад" : "Стабильно"}
                        </span>
                        {f.seasonalFactor !== 1 && (
                          <span className="text-xs text-[var(--c-text3)]">×{f.seasonalFactor}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {urgency !== "ok" ? (
                        <button className="flex items-center gap-1.5 rounded-lg bg-[var(--c-green)] px-3 py-1.5 text-xs font-semibold text-[var(--c-bg)] hover:bg-[#25e890] transition whitespace-nowrap">
                          <ShoppingCart size={11} />
                          Заказать {f.reorderQty} шт
                        </button>
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
        <h3 className="text-xs font-semibold text-[var(--c-text2)] uppercase tracking-wide mb-2">Как работает прогноз</h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 text-xs text-[var(--c-text3)]">
          <div className="flex items-start gap-2">
            <BarChart3 size={13} className="mt-0.5 shrink-0 text-[var(--c-text2)]" />
            <span>Среднедневные продажи рассчитываются по последним 30 дням с учётом тренда</span>
          </div>
          <div className="flex items-start gap-2">
            <Calendar size={13} className="mt-0.5 shrink-0 text-[var(--c-text2)]" />
            <span>Сезонный коэффициент учитывает исторические колебания спроса по месяцам</span>
          </div>
          <div className="flex items-start gap-2">
            <AlertTriangle size={13} className="mt-0.5 shrink-0 text-[var(--c-text2)]" />
            <span>Точка перезаказа = ср. продажи × (срок поставки + страховой запас 3 дня)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}
