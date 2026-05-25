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
} from "lucide-react";
import {
  PRODUCTS,
  PURCHASE_ORDERS,
  TRANSFERS,
  STOCKTAKES,
  MOVEMENTS,
  getAvailableStock,
  getStockStatus,
  getInventoryStats,
  getLowStockProducts,
  getTotalInventoryValue,
  PO_STATUS_LABELS,
} from "@/mock/inventory";
import { StockStatusBadge, POStatusBadge } from "./StockStatusBadge";
import { cn } from "@/lib/utils";

export function InventoryOverview() {
  const stats = useMemo(() => getInventoryStats(PRODUCTS), []);
  const totalValue = useMemo(() => getTotalInventoryValue(PRODUCTS.filter((p) => p.status === "active")), []);
  const lowStockProducts = useMemo(() => getLowStockProducts(PRODUCTS).slice(0, 5), []);
  const recentOrders = useMemo(() => PURCHASE_ORDERS.filter((po) => po.status !== "closed").slice(0, 4), []);
  const recentMovements = useMemo(() => MOVEMENTS.slice(0, 5), []);
  const activeTransfers = useMemo(() => TRANSFERS.filter((t) => t.status === "in_transit"), []);

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="rounded-2xl border border-[var(--c-border)] bg-gradient-to-r from-[var(--c-bg2)] to-[var(--c-bg3)] p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--c-text)]">Склад и товары</h1>
            <p className="mt-1 text-sm text-[var(--c-text2)]">
              Управляйте остатками, поставщиками и движением товаров
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/inventory/products/new"
              className="flex h-9 items-center gap-2 rounded-lg bg-[var(--c-green)] px-4 text-sm font-semibold text-[var(--c-bg)] hover:bg-[#25e890] transition"
            >
              <Package size={15} />
              Добавить товар
            </Link>
          </div>
        </div>

        {/* Quick stats */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <QuickStat label="Активных товаров" value={stats.totalProducts} color="green" />
          <QuickStat label="Деньги в товаре" value={`${(totalValue / 1000).toFixed(0)}К ₽`} color="blue" />
          <QuickStat label="Мало товара" value={stats.lowStockCount} color={stats.lowStockCount > 0 ? "amber" : "default"} />
          <QuickStat label="Нет в наличии" value={stats.outOfStockCount} color={stats.outOfStockCount > 0 ? "red" : "default"} />
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Принять товар", icon: Truck, href: "/inventory/purchase-orders", color: "green" },
          { label: "Создать заказ", icon: ShoppingCart, href: "/inventory/purchase-orders", color: "blue" },
          { label: "Переместить", icon: ArrowLeftRight, href: "/inventory/transfers", color: "amber" },
          { label: "Инвентаризация", icon: ClipboardList, href: "/inventory/stocktake", color: "default" },
        ].map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="flex flex-col items-center gap-2 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] px-4 py-5 text-center transition hover:border-[var(--c-border2)] hover:bg-[var(--c-bg3)]"
          >
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl",
              action.color === "green" ? "bg-[var(--c-green-dim)] text-[var(--c-green)]" :
              action.color === "blue" ? "bg-[var(--c-blue-dim)] text-[var(--c-blue)]" :
              action.color === "amber" ? "bg-[var(--c-amber-dim)] text-[var(--c-amber)]" :
              "bg-[var(--c-bg3)] text-[var(--c-text2)]",
            )}>
              <action.icon size={18} />
            </div>
            <p className="text-xs font-medium text-[var(--c-text)]">{action.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Low stock products */}
        <SectionCard
          title="Требует внимания"
          icon={<AlertTriangle size={16} className="text-[var(--c-amber)]" />}
          href="/inventory/products?stock=low"
          linkLabel="Все товары"
          count={stats.lowStockCount + stats.outOfStockCount}
        >
          {lowStockProducts.length === 0 ? (
            <EmptyRow message="Все товары в норме" />
          ) : (
            lowStockProducts.map((product) => {
              const available = getAvailableStock(product);
              const status = getStockStatus(product);
              return (
                <Link
                  key={product.id}
                  href={`/inventory/products/${product.id}`}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-[var(--c-bg3)]"
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
            })
          )}
        </SectionCard>

        {/* Active purchase orders */}
        <SectionCard
          title="Заказы поставщикам"
          icon={<ShoppingCart size={16} className="text-[var(--c-blue)]" />}
          href="/inventory/purchase-orders"
          linkLabel="Все заказы"
          count={PURCHASE_ORDERS.filter((po) => !["closed", "draft"].includes(po.status)).length}
        >
          {recentOrders.length === 0 ? (
            <EmptyRow message="Нет активных заказов" />
          ) : (
            recentOrders.map((po) => (
              <Link
                key={po.id}
                href="/inventory/purchase-orders"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-[var(--c-bg3)]"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--c-bg3)] border border-[var(--c-border)]">
                  <ShoppingCart size={14} className="text-[var(--c-text3)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--c-text)]">{po.id.toUpperCase()}</p>
                  <p className="text-xs text-[var(--c-text3)] truncate">{po.supplierName}</p>
                </div>
                <div className="text-right shrink-0">
                  <POStatusBadge status={po.status} />
                  <p className="text-xs text-[var(--c-text3)] mt-1 tabular">{po.totalAmount.toLocaleString("ru-RU")} ₽</p>
                </div>
              </Link>
            ))
          )}
        </SectionCard>

        {/* Active transfers */}
        <SectionCard
          title="Перемещения"
          icon={<ArrowLeftRight size={16} className="text-[var(--c-text2)]" />}
          href="/inventory/transfers"
          linkLabel="Все перемещения"
          count={activeTransfers.length}
        >
          {activeTransfers.length === 0 ? (
            <EmptyRow message="Нет активных перемещений" />
          ) : (
            activeTransfers.map((t) => {
              const totalQty = t.items.reduce((s, i) => s + i.qty, 0);
              return (
                <Link
                  key={t.id}
                  href="/inventory/transfers"
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-[var(--c-bg3)]"
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
            })
          )}
        </SectionCard>

        {/* Recent movements */}
        <SectionCard
          title="Последние операции"
          icon={<History size={16} className="text-[var(--c-text2)]" />}
          href="/inventory/history"
          linkLabel="Вся история"
        >
          {recentMovements.map((m) => {
            const isPositive = m.qtyDelta > 0;
            return (
              <div
                key={m.id}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-[var(--c-bg3)]"
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
    <div className="overflow-hidden rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)]">
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

function formatDate(d: string) {
  return new Date(d).toLocaleString("ru-RU", { day: "numeric", month: "short" });
}
