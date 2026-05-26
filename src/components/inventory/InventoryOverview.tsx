"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  Package,
  ShoppingCart,
  ArrowLeftRight,
  ClipboardList,
  AlertTriangle,
  ChevronRight,
  Truck,
  History,
  Users,
} from "lucide-react";
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  getAvailableStock,
  getStockStatus,
  getInventoryStats,
  getLowStockProducts,
  getTotalInventoryValue,
  PO_STATUS_LABELS,
} from "@/mock/inventory";
import { useInventory } from "@/contexts/InventoryContext";
import { StockStatusBadge, POStatusBadge } from "./StockStatusBadge";
import { cn } from "@/lib/utils";
import { computePnL } from "@/lib/inventory/finance";
import { computeAlerts } from "@/lib/inventory/alerts";

// ─── helpers ────────────────────────────────────────────────────────────────

function fmtRub(n: number) {
  return Math.abs(n).toLocaleString("ru-RU");
}

function formatDate(d: string) {
  return new Date(d).toLocaleString("ru-RU", { day: "numeric", month: "short" });
}

// ─── sub-components ─────────────────────────────────────────────────────────

function SectionCard({
  title,
  icon,
  href,
  linkLabel,
  count,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  href: string;
  linkLabel?: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)]">
      <div className="flex items-center justify-between border-b border-[var(--c-border)] px-5 py-4">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-sm font-semibold text-[var(--c-text)]">{title}</h3>
          {count !== undefined && count > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--c-red)] px-1.5 text-xs font-bold text-white">
              {count}
            </span>
          )}
        </div>
        {linkLabel && (
          <Link
            href={href}
            className="flex items-center gap-1 text-xs text-[var(--c-text3)] hover:text-[var(--c-text)] transition"
          >
            {linkLabel}
            <ChevronRight size={12} />
          </Link>
        )}
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

function EmptyRow({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-6 text-sm text-[var(--c-text3)]">
      {message}
    </div>
  );
}

// ─── main component ──────────────────────────────────────────────────────────

export function InventoryOverview() {
  const { products, purchaseOrders, transfers, movements, orders, customers, batches } = useInventory();

  const stats = useMemo(() => getInventoryStats(products), [products]);
  const totalValue = useMemo(() => getTotalInventoryValue(products.filter((p) => p.status === "active")), [products]);
  const allLowStockProducts = useMemo(() => getLowStockProducts(products), [products]);
  const lowStockProducts = useMemo(() => allLowStockProducts.slice(0, 5), [allLowStockProducts]);
  const recentOrders = useMemo(() => purchaseOrders.filter((po) => po.status !== "closed").slice(0, 4), [purchaseOrders]);
  const recentMovements = useMemo(() => movements.slice(0, 5), [movements]);
  const activeTransfers = useMemo(() => transfers.filter((t) => t.status === "in_transit"), [transfers]);
  const pnl = useMemo(() => computePnL(orders), [orders]);
  const pendingSalesOrders = useMemo(() => orders.filter((o) => o.status === "new" || o.status === "confirmed" || o.status === "packed").length, [orders]);
  const vipCustomers = useMemo(() => (customers ?? []).filter((c) => c.tier === "vip").length, [customers]);
  const alerts = useMemo(() => computeAlerts(products, batches ?? []), [products, batches]);

  // Last 14 days revenue sparkline data
  const revenueSparkline = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (13 - i));
      const date = d.toISOString().split("T")[0];
      const rev = orders
        .filter((o) => o.createdAt === date && (o.status === "shipped" || o.status === "delivered"))
        .reduce((s, o) => s + o.revenue, 0);
      return { date, rev };
    });
  }, [orders]);

  // Month label
  const monthLabel = useMemo(() => {
    return new Date().toLocaleString("ru-RU", { month: "long", year: "numeric" });
  }, []);

  // KPI statuses
  const marginStatus = pnl.netMarginPct >= 25 ? "green" : pnl.netMarginPct >= 10 ? "amber" : "red";
  const stockStatus = allLowStockProducts.length === 0 ? "green" : allLowStockProducts.length <= 3 ? "amber" : "red";
  const alertStatus = alerts.length === 0 ? "green" : alerts.length <= 2 ? "amber" : "red";

  const statusColor: Record<string, string> = {
    green: "var(--c-green)",
    amber: "var(--c-amber)",
    red: "var(--c-red)",
  };

  return (
    <div className="space-y-4">

      {/* ── A. P&L HERO CARD ─────────────────────────────────────────────── */}
      <div className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] p-6">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-widest text-[var(--c-text3)]">Обзор</span>
          <span className="text-xs text-[var(--c-text3)] capitalize">{monthLabel}</span>
        </div>

        {/* Hero number + sparkline */}
        <div className="mt-3 flex items-end justify-between gap-6">
          <div>
            <p
              className={cn(
                "text-[2.75rem] font-bold leading-none tabular",
                pnl.netProfit > 0
                  ? "text-[var(--c-green)]"
                  : pnl.netProfit < 0
                  ? "text-[var(--c-red)]"
                  : "text-[var(--c-text)]",
              )}
            >
              {pnl.netProfit < 0 ? "−" : ""}{fmtRub(pnl.netProfit)} ₽
            </p>
            <p className="mt-1 text-sm text-[var(--c-text2)]">Чистая прибыль</p>

            {/* P&L formula row */}
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span className="text-[var(--c-text2)]">
                Выручка&nbsp;<span className="font-medium tabular text-[var(--c-text)]">{fmtRub(pnl.revenue)} ₽</span>
              </span>
              <span className="text-[var(--c-text3)]">−</span>
              <span className="text-[var(--c-text3)]">
                Себест.&nbsp;<span className="tabular">{fmtRub(pnl.cogs)} ₽</span>
              </span>
              <span className="text-[var(--c-text3)]">−</span>
              <span className="text-[var(--c-text3)]">
                Комиссии&nbsp;<span className="tabular">{fmtRub(pnl.commission)} ₽</span>
              </span>
              <span className="text-[var(--c-text3)]">−</span>
              <span className="text-[var(--c-text3)]">
                Логистика&nbsp;<span className="tabular">{fmtRub(pnl.logistics)} ₽</span>
              </span>
              <span className="text-[var(--c-text3)]">=</span>
              <span
                className={cn(
                  "font-bold tabular",
                  pnl.netProfit > 0
                    ? "text-[var(--c-green)]"
                    : pnl.netProfit < 0
                    ? "text-[var(--c-red)]"
                    : "text-[var(--c-text)]",
                )}
              >
                {pnl.netProfit < 0 ? "−" : ""}{fmtRub(pnl.netProfit)} ₽
              </span>
            </div>
          </div>

          {/* Sparkline — desktop only */}
          <div className="hidden lg:block w-48 shrink-0">
            <p className="mb-1 text-[10px] font-medium text-[var(--c-text3)] uppercase tracking-wide">Выручка 14 дней</p>
            <ResponsiveContainer width="100%" height={48}>
              <BarChart data={revenueSparkline} barSize={6}>
                <Bar dataKey="rev" fill="var(--c-green)" radius={[2, 2, 0, 0]} opacity={0.85} />
                <Tooltip
                  cursor={false}
                  content={({ active, payload }) =>
                    active && payload?.[0] ? (
                      <div className="rounded border border-[var(--c-border)] bg-[var(--c-bg3)] px-2 py-1 text-[10px] text-[var(--c-text)]">
                        {Math.round(payload[0].value as number).toLocaleString("ru-RU")} ₽
                      </div>
                    ) : null
                  }
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── B. THREE QUESTION KPI CARDS ──────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

        {/* Card 1 — Заработал ли я? */}
        <div
          className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] p-5"
          style={{ borderLeftWidth: "3px", borderLeftColor: statusColor[marginStatus] }}
        >
          <p className="text-xs font-semibold text-[var(--c-text3)]">Заработал ли я?</p>
          <p
            className={cn(
              "mt-2 text-3xl font-bold tabular",
              marginStatus === "green"
                ? "text-[var(--c-green)]"
                : marginStatus === "amber"
                ? "text-[var(--c-amber)]"
                : "text-[var(--c-red)]",
            )}
          >
            {pnl.netMarginPct.toFixed(1)}%
          </p>
          <p className="mt-0.5 text-xs text-[var(--c-text3)]">маржа чистая</p>
          <p className="mt-2 text-xs text-[var(--c-text2)]">
            {pnl.revenue > 0
              ? `Выручка ${fmtRub(pnl.revenue)} ₽`
              : "Нет реализованных заказов"}
          </p>
        </div>

        {/* Card 2 — Что нужно заказать? */}
        <Link
          href="/inventory/products?stock=low"
          className="block rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] p-5 hover:bg-[var(--c-bg3)] transition"
          style={{ borderLeftWidth: "3px", borderLeftColor: statusColor[stockStatus] }}
        >
          <p className="text-xs font-semibold text-[var(--c-text3)]">Что нужно заказать?</p>
          {allLowStockProducts.length === 0 ? (
            <>
              <p className="mt-2 text-3xl font-bold tabular text-[var(--c-green)]">0</p>
              <p className="mt-0.5 text-xs text-[var(--c-text3)]">товаров</p>
              <p className="mt-2 text-xs text-[var(--c-green)]">Все товары в норме</p>
            </>
          ) : (
            <>
              <p
                className={cn(
                  "mt-2 text-3xl font-bold tabular",
                  stockStatus === "amber" ? "text-[var(--c-amber)]" : "text-[var(--c-red)]",
                )}
              >
                {allLowStockProducts.length}
              </p>
              <p className="mt-0.5 text-xs text-[var(--c-text3)]">
                {allLowStockProducts.length === 1 ? "товар" : "товаров"}
              </p>
              <p className="mt-2 text-xs text-[var(--c-text2)]">мало или нет в наличии</p>
            </>
          )}
        </Link>

        {/* Card 3 — Есть ли проблемы? */}
        <Link
          href="/inventory/notifications"
          className="block rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] p-5 hover:bg-[var(--c-bg3)] transition"
          style={{ borderLeftWidth: "3px", borderLeftColor: statusColor[alertStatus] }}
        >
          <p className="text-xs font-semibold text-[var(--c-text3)]">Есть ли проблемы?</p>
          {alerts.length === 0 ? (
            <>
              <p className="mt-2 text-3xl font-bold tabular text-[var(--c-green)]">0</p>
              <p className="mt-0.5 text-xs text-[var(--c-text3)]">уведомлений</p>
              <p className="mt-2 text-xs text-[var(--c-green)]">Всё в порядке</p>
            </>
          ) : (
            <>
              <p
                className={cn(
                  "mt-2 text-3xl font-bold tabular",
                  alertStatus === "amber" ? "text-[var(--c-amber)]" : "text-[var(--c-red)]",
                )}
              >
                {alerts.length}
              </p>
              <p className="mt-0.5 text-xs text-[var(--c-text3)]">уведомлений</p>
              <p className="mt-2 text-xs text-[var(--c-text2)]">требуют внимания</p>
            </>
          )}
        </Link>
      </div>

      {/* ── C. QUICK ACTIONS ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {[
          { icon: ShoppingCart, label: "Касса", href: "/pos" },
          { icon: Truck, label: "Принять товар", href: "/inventory/purchase-orders" },
          { icon: Package, label: "Добавить товар", href: "/inventory/products/new" },
          { icon: ArrowLeftRight, label: "Переместить", href: "/inventory/transfers?open=create" },
          { icon: ClipboardList, label: "Инвентаризация", href: "/inventory/stocktake?open=create" },
          { icon: Users, label: "Клиенты", href: "/inventory/customers" },
        ].map(({ icon: Icon, label, href }) => (
          <Link
            key={label}
            href={href}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-2 text-sm font-medium text-[var(--c-text2)] hover:bg-[var(--c-bg3)] hover:text-[var(--c-text)] transition"
          >
            <Icon size={14} />
            {label}
          </Link>
        ))}
      </div>

      {/* ── D. TWO-COLUMN DATA GRID ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* Low stock */}
        <SectionCard
          title="Требует внимания"
          icon={<AlertTriangle size={16} className="text-[var(--c-amber)]" />}
          href="/inventory/products?stock=low"
          linkLabel="Все товары"
          count={allLowStockProducts.length}
        >
          {lowStockProducts.length === 0 ? (
            <EmptyRow message="Все товары в норме" />
          ) : (
            <>
              {lowStockProducts.map((product) => {
                const available = getAvailableStock(product);
                const status = getStockStatus(product);
                return (
                  <Link
                    key={product.id}
                    href={`/inventory/products/${product.id}`}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition hover:bg-[var(--c-bg3)]"
                  >
                    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)]">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm">📦</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--c-text)] truncate">{product.name}</p>
                      <p className="text-xs text-[var(--c-text3)]">{product.sku}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={cn(
                        "text-sm font-bold tabular",
                        status === "out_of_stock" ? "text-[var(--c-red)]" : "text-[var(--c-amber)]",
                      )}>
                        {available}
                      </p>
                      <StockStatusBadge status={status} size="sm" />
                    </div>
                  </Link>
                );
              })}
              {allLowStockProducts.length > 5 && (
                <Link
                  href="/inventory/products?stock=low"
                  className="flex items-center justify-center rounded-lg px-3 py-2 text-xs text-[var(--c-text3)] hover:text-[var(--c-text2)] transition"
                >
                  Ещё {allLowStockProducts.length - 5} товаров →
                </Link>
              )}
            </>
          )}
        </SectionCard>

        {/* Purchase orders */}
        <SectionCard
          title="Заказы поставщикам"
          icon={<ShoppingCart size={16} className="text-[var(--c-blue)]" />}
          href="/inventory/purchase-orders"
          linkLabel="Все заказы"
          count={purchaseOrders.filter((po) => !["closed", "draft"].includes(po.status)).length}
        >
          {recentOrders.length === 0 ? (
            <EmptyRow message="Нет активных заказов" />
          ) : (
            recentOrders.map((po) => {
              const isOverdue = po.expectedArrival &&
                !["closed", "draft"].includes(po.status) &&
                new Date(po.expectedArrival) < new Date();
              const daysOver = isOverdue
                ? Math.floor((Date.now() - new Date(po.expectedArrival!).getTime()) / 86400000)
                : 0;
              return (
                <Link
                  key={po.id}
                  href={`/inventory/purchase-orders/${po.id}`}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 transition hover:bg-[var(--c-bg3)]",
                    isOverdue && "bg-[var(--c-red-dim)]",
                  )}
                >
                  <div className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
                    isOverdue
                      ? "bg-[var(--c-red-dim)] border-[var(--c-red)]/30"
                      : "bg-[var(--c-bg3)] border-[var(--c-border)]",
                  )}>
                    {isOverdue
                      ? <AlertTriangle size={14} className="text-[var(--c-red)]" />
                      : <ShoppingCart size={14} className="text-[var(--c-text3)]" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--c-text)]">{po.id.toUpperCase()}</p>
                    <p className="text-xs text-[var(--c-text3)] truncate">{po.supplierName}</p>
                  </div>
                  <div className="text-right shrink-0">
                    {isOverdue ? (
                      <span className="text-xs font-medium text-[var(--c-red)]">Просрочен {daysOver} дн.</span>
                    ) : (
                      <POStatusBadge status={po.status} />
                    )}
                    <p className="text-xs text-[var(--c-text3)] mt-1 tabular">{po.totalAmount.toLocaleString("ru-RU")} ₽</p>
                  </div>
                </Link>
              );
            })
          )}
        </SectionCard>

        {/* Active transfers — only if there are any */}
        {activeTransfers.length > 0 && (
          <SectionCard
            title="Перемещения"
            icon={<ArrowLeftRight size={16} className="text-[var(--c-text2)]" />}
            href="/inventory/transfers"
            linkLabel="Все перемещения"
            count={activeTransfers.length}
          >
            {activeTransfers.map((t) => {
              const totalQty = t.items.reduce((s, i) => s + i.qty, 0);
              return (
                <Link
                  key={t.id}
                  href="/inventory/transfers"
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition hover:bg-[var(--c-bg3)]"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--c-amber-dim)] border border-[rgba(245,166,35,0.2)]">
                    <Truck size={14} className="text-[var(--c-amber)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--c-text)]">{t.id.toUpperCase()}</p>
                    <p className="text-xs text-[var(--c-text3)] truncate">{totalQty} ед. · {t.items.length} позиций</p>
                  </div>
                  <div className="shrink-0">
                    <span className="inline-flex items-center rounded-full border border-[rgba(245,166,35,0.2)] bg-[var(--c-amber-dim)] px-2.5 py-1 text-xs font-medium text-[var(--c-amber)]">
                      В пути
                    </span>
                  </div>
                </Link>
              );
            })}
          </SectionCard>
        )}

        {/* Recent movements */}
        <SectionCard
          title="Последние операции"
          icon={<History size={16} className="text-[var(--c-text2)]" />}
          href="/inventory/history"
          linkLabel="Вся история"
        >
          {recentMovements.length === 0 ? (
            <p className="py-6 text-center text-sm text-[var(--c-text3)]">Операций пока нет</p>
          ) : recentMovements.map((m) => {
            const isPositive = m.qtyDelta > 0;
            return (
              <div
                key={m.id}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition hover:bg-[var(--c-bg3)]"
              >
                <div className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  isPositive ? "bg-[var(--c-green-dim)] text-[var(--c-green)]" : "bg-[var(--c-red-dim)] text-[var(--c-red)]",
                )}>
                  {isPositive ? "+" : "−"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--c-text)] truncate">{m.productName}</p>
                  <p className="text-xs text-[var(--c-text3)]">{m.reason ?? m.type}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={cn("text-sm font-bold tabular", isPositive ? "text-[var(--c-green)]" : "text-[var(--c-red)]")}>
                    {isPositive ? "+" : ""}{m.qtyDelta}
                  </p>
                  <p className="text-xs text-[var(--c-text3)]">{formatDate(m.createdAt)}</p>
                </div>
              </div>
            );
          })}
        </SectionCard>
      </div>
    </div>
  );
}

/* OLD:
"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  Package,
  ShoppingCart,
  ArrowLeftRight,
  ClipboardList,
  TrendingDown,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  ChevronRight,
  Bell,
  Zap,
  Truck,
  History,
  Users,
} from "lucide-react";
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  getAvailableStock,
  getStockStatus,
  getInventoryStats,
  getLowStockProducts,
  getTotalInventoryValue,
  PO_STATUS_LABELS,
} from "@/mock/inventory";
import { useInventory } from "@/contexts/InventoryContext";
import { StockStatusBadge, POStatusBadge } from "./StockStatusBadge";
import { cn } from "@/lib/utils";
import { computePnL } from "@/lib/inventory/finance";

export function InventoryOverview() {
  const { products, purchaseOrders, transfers, movements, orders, customers } = useInventory();

  const stats = useMemo(() => getInventoryStats(products), [products]);
  const totalValue = useMemo(() => getTotalInventoryValue(products.filter((p) => p.status === "active")), [products]);
  const allLowStockProducts = useMemo(() => getLowStockProducts(products), [products]);
  const lowStockProducts = useMemo(() => allLowStockProducts.slice(0, 5), [allLowStockProducts]);
  const recentOrders = useMemo(() => purchaseOrders.filter((po) => po.status !== "closed").slice(0, 4), [purchaseOrders]);
  const recentMovements = useMemo(() => movements.slice(0, 5), [movements]);
  const activeTransfers = useMemo(() => transfers.filter((t) => t.status === "in_transit"), [transfers]);
  const pnl = useMemo(() => computePnL(orders), [orders]);
  const pendingSalesOrders = useMemo(() => orders.filter((o) => o.status === "new" || o.status === "confirmed" || o.status === "packed").length, [orders]);
  const vipCustomers = useMemo(() => (customers ?? []).filter((c) => c.tier === "vip").length, [customers]);

  const revenueSparkline = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (13 - i));
      const date = d.toISOString().split("T")[0];
      const rev = orders
        .filter((o) => o.createdAt === date && (o.status === "shipped" || o.status === "delivered"))
        .reduce((s, o) => s + o.revenue, 0);
      return { date, rev };
    });
  }, [orders]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[var(--c-border)] bg-gradient-to-r from-[var(--c-bg2)] to-[var(--c-bg3)] p-6">
        ...
      </div>
    </div>
  );
}

function QuickStat({ label, value, color }: { label: string; value: string | number; color: string }) {
  const colorMap: Record<string, string> = {
    green: "text-[var(--c-green)]",
    blue: "text-[var(--c-blue)]",
    amber: "text-[var(--c-amber)]",
    red: "text-[var(--c-red)]",
    default: "text-[var(--c-text)]",
  };
  return (
    <div className="rounded-xl bg-black/20 px-4 py-3">
      <p className="text-xs text-[var(--c-text3)]">{label}</p>
      <p className={cn("mt-0.5 text-xl font-bold tabular", colorMap[color])}>{value}</p>
    </div>
  );
}
*/
