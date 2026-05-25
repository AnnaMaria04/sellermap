"use client";

import { useMemo } from "react";
import {
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Package,
  BarChart3,
  Bell,
  Zap,
  RefreshCw,
  ShoppingCart,
  Archive,
  ArrowRight,
} from "lucide-react";
import {
  getAvailableStock,
  getStockStatus,
  getInventoryStats,
  getLowStockProducts,
  getTotalInventoryValue,
} from "@/mock/inventory";
import { useInventory } from "@/contexts/InventoryContext";
import { StockStatusBadge } from "./StockStatusBadge";
import { cn } from "@/lib/utils";

type Alert = {
  id: string;
  type: "low_stock" | "out_of_stock" | "price_change" | "margin_drop" | "labeling" | "overstock" | "reorder";
  title: string;
  message: string;
  severity: "high" | "medium" | "low";
  productId?: string;
  action?: string;
};

type Recommendation = {
  id: string;
  type: "order" | "stop" | "discount" | "move" | "review" | "reorder";
  title: string;
  message: string;
  productId?: string;
  priority: "high" | "medium" | "low";
};

export function InventoryAnalytics() {
  const { products: PRODUCTS, locations } = useInventory();
  const stats = useMemo(() => getInventoryStats(PRODUCTS), [PRODUCTS]);

  const alerts: Alert[] = useMemo(() => {
    const list: Alert[] = [];
    PRODUCTS.filter((p) => p.status === "active").forEach((p) => {
      const status = getStockStatus(p);
      const available = getAvailableStock(p);

      if (status === "out_of_stock") {
        list.push({
          id: `oos-${p.id}`,
          type: "out_of_stock",
          title: "Нет в наличии",
          message: `«${p.name}» — остатки исчерпаны`,
          severity: "high",
          productId: p.id,
          action: "Создать заказ",
        });
      } else if (status === "low_stock") {
        list.push({
          id: `low-${p.id}`,
          type: "low_stock",
          title: "Мало товара",
          message: `«${p.name}» — осталось ${available} шт`,
          severity: "medium",
          productId: p.id,
          action: "Заказать",
        });
      }

      if (p.requiresLabeling && !p.dataMatrixCode) {
        list.push({
          id: `label-${p.id}`,
          type: "labeling",
          title: "Нет маркировки",
          message: `«${p.name}» требует Честный Знак`,
          severity: "high",
          productId: p.id,
          action: "Маркировать",
        });
      }

      if ((p.margin ?? 0) < 15 && p.status === "active") {
        list.push({
          id: `margin-${p.id}`,
          type: "margin_drop",
          title: "Низкая маржа",
          message: `«${p.name}» — маржа ${p.margin?.toFixed(1)}%`,
          severity: "medium",
          productId: p.id,
          action: "Проверить цену",
        });
      }
    });
    return list.sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return order[a.severity] - order[b.severity];
    });
  }, [PRODUCTS]);

  const recommendations: Recommendation[] = useMemo(() => {
    const list: Recommendation[] = [];
    getLowStockProducts(PRODUCTS).forEach((p) => {
      list.push({
        id: `reorder-${p.id}`,
        type: "reorder",
        title: "Пора заказывать",
        message: `«${p.name}» — средние продажи 5 шт/день, запасов на 3 дня`,
        productId: p.id,
        priority: "high",
      });
    });
    PRODUCTS.filter((p) => getStockStatus(p) === "overstock").forEach((p) => {
      list.push({
        id: `overstock-${p.id}`,
        type: "discount",
        title: "Переизбыток запасов",
        message: `«${p.name}» — ${p.totalPhysical} шт, оборот медленный. Рассмотрите скидку.`,
        productId: p.id,
        priority: "medium",
      });
    });
    return list;
  }, [PRODUCTS]);

  const topByValue = useMemo(() => {
    return [...PRODUCTS]
      .filter((p) => p.status === "active")
      .map((p) => ({ ...p, totalValue: p.totalPhysical * p.costPrice }))
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 5);
  }, [PRODUCTS]);

  const totalValue = useMemo(() => getTotalInventoryValue(PRODUCTS.filter((p) => p.status === "active")), [PRODUCTS]);

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KPICard
          label="Товаров"
          value={stats.totalProducts}
          icon={<Package size={16} />}
          color="text-[var(--c-text)]"
        />
        <KPICard
          label="Единиц"
          value={stats.totalUnits.toLocaleString("ru-RU")}
          icon={<BarChart3 size={16} />}
          color="text-[var(--c-blue)]"
        />
        <KPICard
          label="Деньги в товаре"
          value={totalValue > 1000000 ? `${(totalValue / 1000000).toFixed(1)}М ₽` : `${(totalValue / 1000).toFixed(0)}К ₽`}
          icon={<DollarSign size={16} />}
          color="text-[var(--c-green)]"
        />
        <KPICard
          label="Мало"
          value={stats.lowStockCount}
          icon={<TrendingDown size={16} />}
          color={stats.lowStockCount > 0 ? "text-[var(--c-amber)]" : "text-[var(--c-text2)]"}
        />
        <KPICard
          label="Нет"
          value={stats.outOfStockCount}
          icon={<AlertTriangle size={16} />}
          color={stats.outOfStockCount > 0 ? "text-[var(--c-red)]" : "text-[var(--c-text2)]"}
        />
        <KPICard
          label="Ср. маржа"
          value={`${stats.avgMargin.toFixed(1)}%`}
          icon={<TrendingUp size={16} />}
          color={stats.avgMargin >= 30 ? "text-[var(--c-green)]" : stats.avgMargin >= 15 ? "text-[var(--c-amber)]" : "text-[var(--c-red)]"}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Alerts */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Bell size={16} className="text-[var(--c-red)]" />
            <h2 className="text-base font-semibold text-[var(--c-text)]">Уведомления</h2>
            {alerts.length > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--c-red)] px-1.5 text-xs font-bold text-white">
                {alerts.length}
              </span>
            )}
          </div>
          {alerts.length === 0 ? (
            <EmptyState message="Нет уведомлений — всё в порядке!" icon={<Bell size={24} />} />
          ) : (
            <div className="space-y-2">
              {alerts.slice(0, 6).map((alert) => (
                <AlertCard key={alert.id} alert={alert} />
              ))}
              {alerts.length > 6 && (
                <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--c-border2)] py-2.5 text-sm text-[var(--c-text2)] hover:text-[var(--c-text)] transition">
                  Показать ещё {alerts.length - 6}
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Recommendations */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Zap size={16} className="text-[var(--c-amber)]" />
            <h2 className="text-base font-semibold text-[var(--c-text)]">Рекомендации</h2>
          </div>
          {recommendations.length === 0 ? (
            <EmptyState message="Нет рекомендаций — всё оптимально!" icon={<Zap size={24} />} />
          ) : (
            <div className="space-y-2">
              {recommendations.map((rec) => (
                <RecommendationCard key={rec.id} rec={rec} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ABC Analysis */}
      <div>
        <h2 className="mb-4 text-base font-semibold text-[var(--c-text)]">ABC-анализ: деньги в товаре</h2>
        <div className="overflow-hidden rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)]">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--c-border)]">
                <th className="px-5 py-3 text-left text-xs font-medium text-[var(--c-text2)]">Товар</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-[var(--c-text2)]">Остаток</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-[var(--c-text2)]">Себест.</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-[var(--c-text2)]">Сумма в товаре</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-[var(--c-text2)]">Доля %</th>
                <th className="px-5 py-3 text-center text-xs font-medium text-[var(--c-text2)]">Статус</th>
              </tr>
            </thead>
            <tbody>
              {topByValue.map((product, i) => {
                const pct = totalValue > 0 ? (product.totalValue / totalValue) * 100 : 0;
                const group = pct > 50 ? "A" : pct > 20 ? "B" : "C";
                return (
                  <tr key={product.id} className="border-b border-[var(--c-border)] last:border-0 hover:bg-[var(--c-bg3)] transition">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold shrink-0",
                          group === "A" ? "bg-[var(--c-green-dim)] text-[var(--c-green)]" :
                          group === "B" ? "bg-[var(--c-amber-dim)] text-[var(--c-amber)]" :
                          "bg-[var(--c-bg3)] text-[var(--c-text3)]",
                        )}>
                          {group}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-[var(--c-text)]">{product.name}</p>
                          <p className="text-xs text-[var(--c-text3)]">{product.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right tabular">
                      <span className="text-sm text-[var(--c-text)]">{product.totalPhysical}</span>
                    </td>
                    <td className="px-5 py-3 text-right tabular">
                      <span className="text-sm text-[var(--c-text2)]">{product.costPrice.toLocaleString("ru-RU")} ₽</span>
                    </td>
                    <td className="px-5 py-3 text-right tabular">
                      <span className="text-sm font-semibold text-[var(--c-text)]">
                        {product.totalValue.toLocaleString("ru-RU")} ₽
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div>
                        <span className="text-sm font-medium text-[var(--c-text)] tabular">{pct.toFixed(1)}%</span>
                        <div className="mt-1 h-1 w-16 ml-auto rounded-full bg-[var(--c-bg3)] overflow-hidden">
                          <div
                            className={cn("h-full rounded-full", group === "A" ? "bg-[var(--c-green)]" : group === "B" ? "bg-[var(--c-amber)]" : "bg-[var(--c-text3)]")}
                            style={{ width: `${Math.min(100, pct * 2)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <StockStatusBadge status={getStockStatus(product)} size="sm" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock by location */}
      <div>
        <h2 className="mb-4 text-base font-semibold text-[var(--c-text)]">Распределение по локациям</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {locations.map((loc) => {
            const units = PRODUCTS.reduce((s, p) => s + (p.stockByLocation[loc.id] ?? 0), 0);
            const value = PRODUCTS.reduce((s, p) => s + (p.stockByLocation[loc.id] ?? 0) * p.costPrice, 0);
            return (
              <div key={loc.id} className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
                <p className="text-xs text-[var(--c-text2)] mb-2">{loc.name}</p>
                <p className="text-xl font-bold text-[var(--c-text)] tabular">{units} шт</p>
                <p className="text-xs text-[var(--c-text3)] mt-0.5 tabular">{value.toLocaleString("ru-RU")} ₽</p>
                <div className="mt-2 h-1 rounded-full bg-[var(--c-bg3)] overflow-hidden">
                  <div className="h-full rounded-full bg-[var(--c-green)]" style={{ width: `${Math.min(100, (units / 500) * 100)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Margin distribution */}
      <div>
        <h2 className="mb-4 text-base font-semibold text-[var(--c-text)]">Распределение маржи</h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Высокая (≥30%)", min: 30, color: "text-[var(--c-green)]", bar: "bg-[var(--c-green)]", range: "≥30%" },
            { label: "Рабочая (15–30%)", min: 15, max: 30, color: "text-[var(--c-amber)]", bar: "bg-[var(--c-amber)]", range: "15–30%" },
            { label: "Слабая (<15%)", max: 15, color: "text-[var(--c-red)]", bar: "bg-[var(--c-red)]", range: "<15%" },
          ].map((tier) => {
            const count = PRODUCTS.filter((p) => {
              const m = p.margin ?? 0;
              if (tier.min !== undefined && tier.max !== undefined) return m >= tier.min && m < tier.max;
              if (tier.min !== undefined) return m >= tier.min;
              return m < (tier.max ?? 0);
            }).length;
            const pct = PRODUCTS.length > 0 ? (count / PRODUCTS.length) * 100 : 0;
            return (
              <div key={tier.label} className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
                <p className="text-xs text-[var(--c-text2)] mb-1">{tier.label}</p>
                <p className={cn("text-2xl font-bold tabular", tier.color)}>{count}</p>
                <p className="text-xs text-[var(--c-text3)]">товаров</p>
                <div className="mt-2 h-1.5 rounded-full bg-[var(--c-bg3)] overflow-hidden">
                  <div className={cn("h-full rounded-full", tier.bar)} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function KPICard({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color: string }) {
  return (
    <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
      <div className={cn("mb-2", color)}>{icon}</div>
      <p className="text-xs text-[var(--c-text2)]">{label}</p>
      <p className={cn("mt-0.5 text-xl font-bold tabular", color)}>{value}</p>
    </div>
  );
}

function AlertCard({ alert }: { alert: Alert }) {
  const sev = {
    high: { icon: <AlertTriangle size={14} />, cls: "bg-[var(--c-red-dim)] border-[rgba(240,80,80,0.2)] text-[var(--c-red)]" },
    medium: { icon: <AlertTriangle size={14} />, cls: "bg-[var(--c-amber-dim)] border-[rgba(245,166,35,0.2)] text-[var(--c-amber)]" },
    low: { icon: <Bell size={14} />, cls: "bg-[var(--c-bg3)] border-[var(--c-border2)] text-[var(--c-text2)]" },
  }[alert.severity];

  return (
    <div className={cn("flex items-center gap-3 rounded-xl border px-4 py-3", sev.cls)}>
      <span className="shrink-0">{sev.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold">{alert.title}</p>
        <p className="text-xs opacity-80 truncate">{alert.message}</p>
      </div>
      {alert.action && (
        <button className="shrink-0 rounded-lg border border-current px-2.5 py-1 text-xs font-medium opacity-80 hover:opacity-100 transition whitespace-nowrap">
          {alert.action}
        </button>
      )}
    </div>
  );
}

function RecommendationCard({ rec }: { rec: Recommendation }) {
  const icon: Record<string, React.ReactNode> = {
    reorder: <ShoppingCart size={14} />,
    discount: <TrendingDown size={14} />,
    order: <ShoppingCart size={14} />,
    stop: <Archive size={14} />,
    move: <RefreshCw size={14} />,
    review: <BarChart3 size={14} />,
  };
  return (
    <div className="flex items-start gap-3 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] px-4 py-3 hover:bg-[var(--c-bg3)] transition">
      <span className={cn(
        "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
        rec.priority === "high" ? "bg-[var(--c-green-dim)] text-[var(--c-green)]" : "bg-[var(--c-bg3)] text-[var(--c-text2)]",
      )}>
        {icon[rec.type] ?? <Zap size={14} />}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--c-text)]">{rec.title}</p>
        <p className="text-xs text-[var(--c-text2)] mt-0.5 leading-relaxed">{rec.message}</p>
      </div>
      <button className="shrink-0 rounded-lg border border-[var(--c-border2)] px-2.5 py-1 text-xs text-[var(--c-text2)] hover:text-[var(--c-text)] transition">
        →
      </button>
    </div>
  );
}

function EmptyState({ message, icon }: { message: string; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] py-10 text-center">
      <span className="text-[var(--c-text3)] mb-3">{icon}</span>
      <p className="text-sm text-[var(--c-text2)]">{message}</p>
    </div>
  );
}
