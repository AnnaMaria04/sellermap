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
} from "lucide-react";
import { useInventory } from "@/contexts/InventoryContext";
import {
  computeProductMetrics,
  summarizeAnalytics,
  type ProductMetrics,
  type ABCClass,
} from "@/lib/inventory/analytics";
import { cn } from "@/lib/utils";

const WINDOWS = [
  { days: 30, label: "30 дней" },
  { days: 60, label: "60 дней" },
  { days: 90, label: "90 дней" },
];

const ABC_META: Record<ABCClass, { label: string; color: string; bg: string; desc: string }> = {
  A: { label: "A", color: "text-[var(--c-green)]", bg: "bg-[var(--c-green)]", desc: "≈80% стоимости запасов" },
  B: { label: "B", color: "text-[var(--c-amber)]", bg: "bg-[var(--c-amber)]", desc: "≈15% стоимости запасов" },
  C: { label: "C", color: "text-[var(--c-text2)]", bg: "bg-[var(--c-text3)]", desc: "≈5% стоимости запасов" },
};

function rub(n: number): string {
  return Math.round(n).toLocaleString("ru-RU") + " ₽";
}

export function TurnoverAnalysis() {
  const { products, movements } = useInventory();
  const [windowDays, setWindowDays] = useState(30);

  const metrics = useMemo(
    () => computeProductMetrics(products, movements, { windowDays, deadStockDays: 60 }),
    [products, movements, windowDays],
  );
  const summary = useMemo(() => summarizeAnalytics(metrics, windowDays), [metrics, windowDays]);

  const leaders = useMemo(
    () => [...metrics].filter((m) => m.turnoverRatio > 0).sort((a, b) => b.turnoverRatio - a.turnoverRatio).slice(0, 5),
    [metrics],
  );
  const laggards = useMemo(
    () => [...metrics].sort((a, b) => a.turnoverRatio - b.turnoverRatio).slice(0, 5),
    [metrics],
  );
  const deadStock = useMemo(
    () => metrics.filter((m) => m.isDeadStock).sort((a, b) => b.inventoryValue - a.inventoryValue),
    [metrics],
  );

  const abcTotal = summary.abcCounts.A + summary.abcCounts.B + summary.abcCounts.C || 1;

  return (
    <div className="space-y-6">
      {/* Header + window selector */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--c-text)]">Оборачиваемость и ABC-анализ</h2>
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
        <KPI label="Средняя оборачиваемость" value={`${summary.avgTurnover.toFixed(1)}×`} sub="в год" icon={<RefreshCw size={16} />} color="text-[var(--c-green)]" />
        <KPI label="Sell-through" value={`${Math.round(summary.avgSellThrough * 100)}%`} sub="продано / запас" icon={<TrendingUp size={16} />} color="text-[var(--c-blue)]" />
        <KPI label="Неликвид" value={summary.deadStockCount} sub={rub(summary.deadStockValue)} icon={<AlertTriangle size={16} />} color={summary.deadStockCount > 0 ? "text-[var(--c-red)]" : "text-[var(--c-text2)]"} />
        <KPI label="Стоимость запасов" value={rub(summary.totalInventoryValue)} sub={`${metrics.length} SKU`} icon={<DollarSign size={16} />} color="text-[var(--c-text)]" />
      </div>

      {/* ABC distribution */}
      <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-5">
        <div className="mb-4 flex items-center gap-2">
          <Layers size={15} className="text-[var(--c-text2)]" />
          <h3 className="text-sm font-semibold text-[var(--c-text)]">ABC-классификация по стоимости</h3>
        </div>
        <div className="mb-4 flex h-3 overflow-hidden rounded-full bg-[var(--c-bg3)]">
          {(["A", "B", "C"] as ABCClass[]).map((cls) => {
            const pct = (summary.abcCounts[cls] / abcTotal) * 100;
            if (pct === 0) return null;
            return <div key={cls} className={cn("h-full", ABC_META[cls].bg)} style={{ width: `${pct}%` }} />;
          })}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {(["A", "B", "C"] as ABCClass[]).map((cls) => (
            <div key={cls} className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] p-3">
              <div className="flex items-center gap-2">
                <span className={cn("flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold text-[var(--c-bg)]", ABC_META[cls].bg)}>
                  {ABC_META[cls].label}
                </span>
                <span className="text-sm font-semibold text-[var(--c-text)]">{summary.abcCounts[cls]} SKU</span>
              </div>
              <p className="mt-1.5 text-xs text-[var(--c-text3)]">{ABC_META[cls].desc}</p>
              <p className="mt-1 text-xs font-medium text-[var(--c-text2)]">{rub(summary.abcValue[cls])}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Leaders / laggards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RankList title="Лидеры оборачиваемости" icon={<TrendingUp size={15} className="text-[var(--c-green)]" />} rows={leaders} kind="leader" />
        <RankList title="Медленные товары" icon={<TrendingDown size={15} className="text-[var(--c-amber)]" />} rows={laggards} kind="laggard" />
      </div>

      {/* Dead stock */}
      <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-5">
        <div className="mb-4 flex items-center gap-2">
          <AlertTriangle size={15} className="text-[var(--c-red)]" />
          <h3 className="text-sm font-semibold text-[var(--c-text)]">Неликвид (нет продаж 60+ дней)</h3>
        </div>
        {deadStock.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Package size={32} className="mb-2 text-[var(--c-text3)]" />
            <p className="text-sm text-[var(--c-text2)]">Неликвидных товаров не обнаружено</p>
          </div>
        ) : (
          <div className="space-y-2">
            {deadStock.map((m) => (
              <div key={m.product.id} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] px-4 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--c-text)]">{m.product.name}</p>
                  <p className="text-xs text-[var(--c-text3)]">
                    {m.product.sku} · {m.product.totalPhysical} шт на складе
                    {m.lastSaleDaysAgo !== null ? ` · последняя продажа ${m.lastSaleDaysAgo} дн. назад` : " · продаж не было"}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-[var(--c-red)] tabular">{rub(m.inventoryValue)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function KPI({ label, value, sub, icon, color }: { label: string; value: string | number; sub?: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
      <div className={cn("mb-2", color)}>{icon}</div>
      <p className="text-xs text-[var(--c-text2)]">{label}</p>
      <p className={cn("mt-0.5 text-xl font-bold tabular", color)}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-[var(--c-text3)]">{sub}</p>}
    </div>
  );
}

function RankList({ title, icon, rows, kind }: { title: string; icon: React.ReactNode; rows: ProductMetrics[]; kind: "leader" | "laggard" }) {
  return (
    <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-5">
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-semibold text-[var(--c-text)]">{title}</h3>
      </div>
      {rows.length === 0 ? (
        <p className="py-4 text-center text-sm text-[var(--c-text3)]">Недостаточно данных о продажах</p>
      ) : (
        <div className="space-y-2">
          {rows.map((m) => (
            <div key={m.product.id} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm text-[var(--c-text)]">{m.product.name}</p>
                <p className="text-xs text-[var(--c-text3)]">
                  {m.daysOfInventory === Infinity ? "∞ дней запаса" : `${Math.round(m.daysOfInventory)} дн. запаса`} · продано {m.unitsSold} шт
                </p>
              </div>
              <span className={cn("shrink-0 text-sm font-semibold tabular", kind === "leader" ? "text-[var(--c-green)]" : "text-[var(--c-amber)]")}>
                {m.turnoverRatio.toFixed(1)}×
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
