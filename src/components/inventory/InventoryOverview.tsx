"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Package,
  ShoppingCart,
  ArrowLeftRight,
  ClipboardList,
  AlertTriangle,
  ChevronRight,
  Truck,
  History,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  getAvailableStock,
  getStockStatus,
  getLowStockProducts,
} from "@/mock/inventory";
import { useInventory } from "@/contexts/InventoryContext";
import { StockStatusBadge, POStatusBadge } from "./StockStatusBadge";
import { cn, formatRUB } from "@/lib/utils";
import { computePnL, costLookupFromProducts } from "@/lib/inventory/finance";
import { computeAlerts } from "@/lib/inventory/alerts";

function fmt(n: number) {
  return Math.round(n).toLocaleString("ru-RU");
}

function formatDate(d: string) {
  return new Date(d).toLocaleString("ru-RU", { day: "numeric", month: "short" });
}

// ─── Shopify-style stat strip ─────────────────────────────────────────────────

type StatStatus = "good" | "warn" | "bad" | "neutral";

function StatStrip({ stats }: {
  stats: { label: string; value: string; sub?: string; status?: StatStatus }[];
}) {
  const dot: Record<StatStatus, string> = {
    good:    "bg-[var(--c-green)]",
    warn:    "bg-[var(--c-amber)]",
    bad:     "bg-[var(--c-red)]",
    neutral: "bg-[var(--c-border2)]",
  };
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)]">
      {/* 2 columns on phones, 4 across on ≥sm. The 1px gap over a border-coloured
          background draws clean separators in both layouts (divide-* would
          misplace borders once the row wraps). */}
      <div className="grid grid-cols-2 gap-px bg-[var(--c-border)] sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-[var(--c-bg2)] px-4 py-3 sm:px-5 sm:py-4">
            <p className="text-[11px] uppercase tracking-wide text-[var(--c-text3)]">{s.label}</p>
            <div className="mt-2 flex items-end justify-between gap-2">
              <p className="text-xl font-bold tabular leading-none text-[var(--c-text)] sm:text-[1.4rem]">{s.value}</p>
              {s.status && (
                <span className={cn("mb-0.5 h-2 w-2 shrink-0 rounded-full", dot[s.status])} />
              )}
            </div>
            {s.sub && (
              <p className="mt-1 text-[11px] text-[var(--c-text3)]">{s.sub}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Section block (Shopify card style) ──────────────────────────────────────

function Block({
  title,
  subtitle,
  href,
  linkLabel,
  badge,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  linkLabel?: string;
  badge?: number;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)]", className)}>
      <div className="flex items-start justify-between border-b border-[var(--c-border)] px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-[var(--c-text)]">{title}</h3>
            {badge !== undefined && badge > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--c-red)] px-1.5 text-xs font-bold text-white">
                {badge}
              </span>
            )}
          </div>
          {subtitle && <p className="mt-0.5 text-xs text-[var(--c-text3)]">{subtitle}</p>}
        </div>
        {href && linkLabel && (
          <Link
            href={href}
            className="flex shrink-0 items-center gap-1 text-xs text-[var(--c-text3)] hover:text-[var(--c-text)] transition"
          >
            {linkLabel}
            <ChevronRight size={12} />
          </Link>
        )}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function EmptyState({ message, ctaLabel, ctaHref }: { message: string; ctaLabel?: string; ctaHref?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8 text-sm text-[var(--c-text3)]">
      {message}
      {ctaLabel && ctaHref && (
        <Link
          href={ctaHref}
          className="rounded-lg border border-[var(--c-border2)] px-3 py-1.5 text-xs font-medium text-[var(--c-text2)] transition hover:text-[var(--c-text)]"
        >
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}

// ─── Dashboard period filter ────────────────────────────────────────────────

type PeriodId = "today" | "7d" | "30d" | "all";
const PERIODS: { id: PeriodId; label: string; days: number }[] = [
  { id: "today", label: "Сегодня", days: 1 },
  { id: "7d",    label: "7 дней",  days: 7 },
  { id: "30d",   label: "30 дней", days: 30 },
  { id: "all",   label: "Всё время", days: 0 },
];

// ─── Quick actions ────────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { label: "Добавить товар",    href: "/inventory/products/new",            icon: Package },
  { label: "Принять товар",     href: "/inventory/purchase-orders",         icon: Truck },
  { label: "Переместить",       href: "/inventory/transfers?open=create",   icon: ArrowLeftRight },
  { label: "Инвентаризация",    href: "/inventory/stocktake?open=create",   icon: ClipboardList },
  { label: "Открыть кассу",     href: "/pos",                               icon: ShoppingCart },
];

// ─── Main component ────────────────────────────────────────────────────────────

export function InventoryOverview() {
  const { products, purchaseOrders, transfers, movements, orders, customers, batches } = useInventory();

  const allLowStock       = useMemo(() => getLowStockProducts(products), [products]);
  const lowStock          = useMemo(() => allLowStock.slice(0, 6), [allLowStock]);
  const activePOs         = useMemo(() => purchaseOrders.filter((po) => !["closed", "draft"].includes(po.status)).slice(0, 6), [purchaseOrders]);
  const recentMovements   = useMemo(() => movements.slice(0, 6), [movements]);
  const activeTransfers   = useMemo(() => transfers.filter((t) => t.status === "in_transit"), [transfers]);
  const costFor           = useMemo(() => costLookupFromProducts(products), [products]);

  // Date-range filter for the P&L KPIs and the revenue chart.
  const [period, setPeriod] = useState<PeriodId>("30d");
  const periodCfg = PERIODS.find((p) => p.id === period)!;
  const periodStart = useMemo(() => {
    if (periodCfg.days === 0) return null; // "all time"
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (periodCfg.days - 1));
    return d.toISOString().slice(0, 10);
  }, [periodCfg]);
  const periodOrders = useMemo(
    () => (periodStart ? orders.filter((o) => (o.deliveredAt ?? o.createdAt) >= periodStart) : orders),
    [orders, periodStart],
  );

  const pnl               = useMemo(() => computePnL(periodOrders, costFor), [periodOrders, costFor]);
  const alerts            = useMemo(() => computeAlerts(products, batches ?? [], purchaseOrders), [products, batches, purchaseOrders]);
  const pendingOrders     = useMemo(() => orders.filter((o) => ["new", "confirmed", "packed"].includes(o.status)).length, [orders]);

  // 30-day revenue for the area chart
  const chartDays = Math.min(Math.max(periodCfg.days || 90, 7), 90);
  const revenueChart = useMemo(() => {
    const today = new Date();
    return Array.from({ length: chartDays }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (chartDays - 1 - i));
      const date = d.toISOString().split("T")[0];
      const rev = orders
        .filter((o) => o.createdAt === date && (o.status === "shipped" || o.status === "delivered"))
        .reduce((s, o) => s + o.revenue, 0);
      return { date, rev };
    });
  }, [orders, chartDays]);

  const monthLabel = useMemo(
    () => new Date().toLocaleString("ru-RU", { month: "long", year: "numeric" }),
    [],
  );

  // "Сколько я заработал сегодня" — the one number that matters on a phone.
  const today = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const todays = orders.filter((o) => (o.deliveredAt ?? o.createdAt) === todayStr);
    const tp = computePnL(todays, costFor);
    const wb = todays.filter((o) => o.channel === "wildberries").length;
    const ozon = todays.filter((o) => o.channel === "ozon").length;
    const other = todays.length - wb - ozon;
    return { profit: tp.netProfit, revenue: tp.revenue, orders: todays.length, wb, ozon, other };
  }, [orders, costFor]);

  return (
    <div className="space-y-4">

      {/* ── Today hero — "сколько я заработал сегодня" ─────────────────────── */}
      <div className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-5 sm:p-6">
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--c-text3)]">Заработано сегодня</p>
        <p className={cn(
          "mt-1 text-4xl font-bold tabular sm:text-5xl",
          today.profit >= 0 ? "text-[var(--c-green)]" : "text-[var(--c-red)]",
        )}>
          {today.profit < 0 ? "−" : ""}{formatRUB(Math.abs(today.profit))}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[var(--c-text2)]">
          <span>Выручка {formatRUB(today.revenue)}</span>
          <span className="text-[var(--c-text3)]">·</span>
          <span>
            {today.orders} {today.orders === 1 ? "заказ" : "заказов"}
            {today.orders > 0 && (
              <span className="text-[var(--c-text3)]">
                {" "}({[today.wb && `WB ${today.wb}`, today.ozon && `Ozon ${today.ozon}`, today.other && `прочее ${today.other}`].filter(Boolean).join(" · ")})
              </span>
            )}
          </span>
        </div>
      </div>

      {/* ── Quick actions (mobile only — desktop uses shell top bar) ────────── */}
      <div className="flex flex-wrap gap-2 lg:hidden">
        {QUICK_ACTIONS.map((a) => (
          <Link
            key={a.label}
            href={a.href}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-1.5 text-sm font-medium text-[var(--c-text2)] transition hover:bg-[var(--c-bg3)] hover:text-[var(--c-text)]"
          >
            <a.icon size={14} className="shrink-0" />
            {a.label}
          </Link>
        ))}
      </div>

      {/* ── Period filter ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-1 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-1 w-fit">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition",
              period === p.id
                ? "bg-[var(--c-bg3)] text-[var(--c-text)]"
                : "text-[var(--c-text2)] hover:text-[var(--c-text)]",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* ── 4-stat strip (Shopify style) ──────────────────────────────────── */}
      <StatStrip
        stats={[
          {
            label: `Выручка · ${periodCfg.label.toLowerCase()}`,
            value: `${fmt(pnl.revenue)} ₽`,
            sub: "реализованные заказы",
            status: "neutral",
          },
          {
            label: "Чистая прибыль",
            value: `${fmt(pnl.netProfit)} ₽`,
            sub: pnl.revenue > 0 ? `${pnl.netMarginPct.toFixed(1)}% маржа` : "нет данных",
            status: pnl.netProfit > 0 ? "good" : pnl.netProfit === 0 ? "neutral" : "bad",
          },
          {
            label: "Мало товара",
            value: String(allLowStock.length),
            sub: allLowStock.length === 0 ? "всё в норме" : "требуют пополнения",
            status: allLowStock.length === 0 ? "good" : allLowStock.length <= 3 ? "warn" : "bad",
          },
          {
            label: "Заказов в работе",
            value: String(pendingOrders),
            sub: pendingOrders === 0 ? `${pnl.orderCount} реализовано` : "обрабатываются",
            status: pendingOrders > 0 ? "warn" : "neutral",
          },
        ]}
      />

      {/* ── Main: Area chart + P&L breakdown ──────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

        {/* Area chart — 2/3 width */}
        <div className="overflow-hidden rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] lg:col-span-2">
          <div className="border-b border-[var(--c-border)] px-5 py-4">
            <p className="text-sm font-semibold text-[var(--c-text)]">Выручка за {chartDays} дней</p>
            <p className="mt-0.5 text-xs text-[var(--c-text3)]">{monthLabel} · реализованные заказы</p>
          </div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={revenueChart} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="var(--c-green)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="var(--c-green)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--c-border)" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "var(--c-text3)", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(d) => new Date(d).toLocaleString("ru-RU", { day: "numeric", month: "short" })}
                  interval={6}
                />
                <YAxis
                  tick={{ fill: "var(--c-text3)", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}К` : String(v)}
                />
                <Tooltip
                  content={({ active, payload, label }) =>
                    active && payload?.[0] ? (
                      <div className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-2 text-xs shadow-lg">
                        <p className="mb-1 text-[var(--c-text2)]">
                          {new Date(label as string).toLocaleString("ru-RU", { day: "numeric", month: "long" })}
                        </p>
                        <p className="font-semibold tabular text-[var(--c-text)]">
                          {fmt(payload[0].value as number)} ₽
                        </p>
                      </div>
                    ) : null
                  }
                />
                <Area
                  type="monotone"
                  dataKey="rev"
                  stroke="var(--c-green)"
                  strokeWidth={2}
                  fill="url(#revGrad)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* P&L breakdown — 1/3 width */}
        <div className="overflow-hidden rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)]">
          <div className="border-b border-[var(--c-border)] px-5 py-4">
            <p className="text-sm font-semibold text-[var(--c-text)]">Разбивка прибыли</p>
            <p className="mt-0.5 text-xs text-[var(--c-text3)]">За текущий месяц</p>
          </div>
          <div className="px-5 py-4 space-y-3">
            {[
              { label: "Выручка",        value: pnl.revenue,     sign: "+" as const, color: "text-[var(--c-blue)]" },
              { label: "Себестоимость",  value: -pnl.cogs,       sign: "−" as const, color: "text-[var(--c-text2)]" },
              { label: "Комиссии МП",    value: -pnl.commission, sign: "−" as const, color: "text-[var(--c-text2)]" },
              { label: "Логистика",      value: -pnl.logistics,  sign: "−" as const, color: "text-[var(--c-text2)]" },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-2">
                <span className="text-sm text-[var(--c-text2)]">{row.label}</span>
                <span className={cn("text-sm tabular font-medium", row.color)}>
                  {row.sign} {fmt(Math.abs(row.value))} ₽
                </span>
              </div>
            ))}
            <div className="border-t border-[var(--c-border)] pt-3 flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-[var(--c-text)]">Чистая прибыль</span>
              <span className={cn(
                "text-sm font-bold tabular",
                pnl.netProfit >= 0 ? "text-[var(--c-green)]" : "text-[var(--c-red)]",
              )}>
                = {pnl.netProfit >= 0 ? "" : "−"}{fmt(Math.abs(pnl.netProfit))} ₽
              </span>
            </div>
            <p className="text-[11px] text-[var(--c-text3)] leading-relaxed">
              Расчёт приблизительный.{" "}
              <Link href="/inventory/finance" className="underline hover:text-[var(--c-text2)] transition">
                Точный отчёт →
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* ── Three content blocks ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

        {/* Block 1: Low stock */}
        <Block
          title="Мало товара"
          subtitle={allLowStock.length > 0 ? `${allLowStock.length} позиций требуют пополнения` : "Все товары в норме"}
          href="/inventory/products?stock=low"
          linkLabel="Все товары"
          badge={allLowStock.length}
        >
          {lowStock.length === 0 ? (
            <EmptyState message="Все запасы в норме" />
          ) : (
            <div className="space-y-1">
              {lowStock.map((p) => {
                const available = getAvailableStock(p);
                const status = getStockStatus(p);
                return (
                  <Link
                    key={p.id}
                    href={`/inventory/products/${p.id}`}
                    className="flex items-center gap-3 rounded-md px-2 py-2 transition hover:bg-[var(--c-bg3)]"
                  >
                    <div className="h-8 w-8 shrink-0 overflow-hidden rounded-md border border-[var(--c-border)] bg-[var(--c-bg3)]">
                      {p.imageUrl
                        ? <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                        : <div className="flex h-full w-full items-center justify-center text-xs">📦</div>
                      }
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-[var(--c-text)]">{p.name}</p>
                      <p className="text-xs text-[var(--c-text3)]">{p.sku}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={cn(
                        "text-sm font-bold tabular",
                        status === "out_of_stock" ? "text-[var(--c-red)]" : "text-[var(--c-amber)]",
                      )}>
                        {available} шт
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </Block>

        {/* Block 2: Active purchase orders */}
        <Block
          title="Заказы поставщикам"
          subtitle={`${activePOs.length} активных заказов`}
          href="/inventory/purchase-orders"
          linkLabel="Все заказы"
          badge={activePOs.filter((po) => po.expectedArrival && new Date(po.expectedArrival) < new Date()).length}
        >
          {activePOs.length === 0 ? (
            <EmptyState message="Нет активных заказов" />
          ) : (
            <div className="space-y-1">
              {activePOs.map((po) => {
                const isOverdue = po.expectedArrival
                  && !["closed", "draft"].includes(po.status)
                  && new Date(po.expectedArrival) < new Date();
                return (
                  <Link
                    key={po.id}
                    href={`/inventory/purchase-orders/${po.id}`}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-2 py-2 transition hover:bg-[var(--c-bg3)]",
                      isOverdue && "bg-[var(--c-red-dim)]",
                    )}
                  >
                    {isOverdue && (
                      <AlertTriangle size={14} className="shrink-0 text-[var(--c-red)]" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[var(--c-text)]">{po.id.toUpperCase()}</p>
                      <p className="truncate text-xs text-[var(--c-text3)]">{po.supplierName}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      {isOverdue
                        ? <p className="text-xs font-medium text-[var(--c-red)]">Просрочен</p>
                        : <POStatusBadge status={po.status} />
                      }
                      <p className="mt-0.5 text-xs tabular text-[var(--c-text3)]">{fmt(po.totalAmount)} ₽</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </Block>

        {/* Block 3: Recent movements */}
        <Block
          title="Последние операции"
          href="/inventory/history"
          linkLabel="Вся история"
        >
          {recentMovements.length === 0 ? (
            <EmptyState message="Операций пока нет" ctaLabel="Синхронизировать маркетплейс" ctaHref="/inventory/settings/integrations" />
          ) : (
            <div className="space-y-1">
              {recentMovements.map((m) => {
                const pos = m.qtyDelta > 0;
                return (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 rounded-md px-2 py-2 transition hover:bg-[var(--c-bg3)]"
                  >
                    <div className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                      pos ? "bg-[var(--c-green-dim)] text-[var(--c-green)]" : "bg-[var(--c-red-dim)] text-[var(--c-red)]",
                    )}>
                      {pos ? "+" : "−"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-[var(--c-text)]">{m.productName}</p>
                      <p className="text-xs text-[var(--c-text3)]">{m.reason ?? m.type} · {formatDate(m.createdAt)}</p>
                    </div>
                    <p className={cn("shrink-0 text-sm font-bold tabular", pos ? "text-[var(--c-green)]" : "text-[var(--c-red)]")}>
                      {pos ? "+" : "−"}{Math.abs(m.qtyDelta)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </Block>

      </div>

      {/* ── Active transfers (only if any) ────────────────────────────────── */}
      {activeTransfers.length > 0 && (
        <Block
          title="В пути"
          subtitle={`${activeTransfers.length} активных перемещений`}
          href="/inventory/transfers"
          linkLabel="Все перемещения"
        >
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {activeTransfers.slice(0, 4).map((t) => (
              <Link
                key={t.id}
                href="/inventory/transfers"
                className="rounded-md border border-[var(--c-border)] px-3 py-2.5 transition hover:bg-[var(--c-bg3)]"
              >
                <p className="text-sm font-medium text-[var(--c-text)]">{t.id.toUpperCase()}</p>
                <p className="mt-0.5 text-xs text-[var(--c-text3)]">
                  {t.items.reduce((s, i) => s + i.qty, 0)} ед.
                </p>
                <span className="mt-1 inline-flex items-center rounded-full bg-[var(--c-amber-dim)] px-2 py-0.5 text-[11px] font-medium text-[var(--c-amber)]">
                  В пути
                </span>
              </Link>
            ))}
          </div>
        </Block>
      )}

    </div>
  );
}
