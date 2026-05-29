"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Package, AlertTriangle, ChevronRight, ArrowUpRight, ArrowDownRight,
  Truck, ArrowLeftRight, ClipboardList, ShoppingCart,
} from "lucide-react";
import {
  AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  getAvailableStock, getStockStatus, getLowStockProducts,
} from "@/mock/inventory";
import { useInventory } from "@/contexts/InventoryContext";
import { POStatusBadge } from "./StockStatusBadge";
import { cn, formatRUB } from "@/lib/utils";
import { InsightsPanel } from "@/components/inventory/InsightsPanel";
import { computePnL, costLookupFromProducts } from "@/lib/inventory/finance";

function fmt(n: number) {
  return Math.round(n).toLocaleString("ru-RU");
}
function formatDate(d: string) {
  return new Date(d).toLocaleString("ru-RU", { day: "numeric", month: "short" });
}

// ── Primitives (premium language) ─────────────────────────────────────────────

function SectionHeader({
  title, sub, href, linkLabel, badge,
}: {
  title: string; sub?: string; href?: string; linkLabel?: string; badge?: number;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--c-text)]">{title}</h3>
          {badge !== undefined && badge > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--c-red-dim)] px-1.5 text-[11px] font-semibold text-[var(--c-red)]">
              {badge}
            </span>
          )}
        </div>
        {sub && <p className="mt-0.5 text-[13px] text-[var(--c-text3)]">{sub}</p>}
      </div>
      {href && linkLabel && (
        <Link href={href} className="flex shrink-0 items-center gap-0.5 text-[13px] font-medium text-[var(--c-text2)] transition hover:text-[var(--c-text)]">
          {linkLabel}<ChevronRight size={14} />
        </Link>
      )}
    </div>
  );
}

function ListEmpty({ message, ctaLabel, ctaHref }: { message: string; ctaLabel?: string; ctaHref?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center text-[13px] text-[var(--c-text3)]">
      {message}
      {ctaLabel && ctaHref && (
        <Link href={ctaHref} className="rounded-lg bg-[var(--c-bg3)] px-3 py-1.5 text-xs font-medium text-[var(--c-text2)] transition hover:text-[var(--c-text)]">
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}

type PeriodId = "today" | "7d" | "30d" | "all";
const PERIODS: { id: PeriodId; label: string; days: number }[] = [
  { id: "today", label: "Сегодня", days: 1 },
  { id: "7d", label: "7 дней", days: 7 },
  { id: "30d", label: "30 дней", days: 30 },
  { id: "all", label: "Всё время", days: 0 },
];

const QUICK_ACTIONS = [
  { label: "Добавить товар", href: "/inventory/products/new", icon: Package },
  { label: "Принять товар", href: "/inventory/purchase-orders", icon: Truck },
  { label: "Переместить", href: "/inventory/transfers?open=create", icon: ArrowLeftRight },
  { label: "Инвентаризация", href: "/inventory/stocktake?open=create", icon: ClipboardList },
  { label: "Касса", href: "/pos", icon: ShoppingCart },
];

// ── Main ──────────────────────────────────────────────────────────────────────

export function InventoryOverview() {
  const { products, purchaseOrders, transfers, movements, orders } = useInventory();

  const allLowStock = useMemo(() => getLowStockProducts(products), [products]);
  const lowStock = useMemo(() => allLowStock.slice(0, 5), [allLowStock]);
  const activePOs = useMemo(() => purchaseOrders.filter((po) => !["closed", "draft"].includes(po.status)).slice(0, 5), [purchaseOrders]);
  const recentMovements = useMemo(() => movements.slice(0, 5), [movements]);
  const activeTransfers = useMemo(() => transfers.filter((t) => t.status === "in_transit"), [transfers]);
  const costFor = useMemo(() => costLookupFromProducts(products), [products]);

  const [period, setPeriod] = useState<PeriodId>("30d");
  const periodCfg = PERIODS.find((p) => p.id === period)!;
  const periodStart = useMemo(() => {
    if (periodCfg.days === 0) return null;
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (periodCfg.days - 1));
    return d.toISOString().slice(0, 10);
  }, [periodCfg]);
  const periodOrders = useMemo(
    () => (periodStart ? orders.filter((o) => (o.deliveredAt ?? o.createdAt) >= periodStart) : orders),
    [orders, periodStart],
  );

  const pnl = useMemo(() => computePnL(periodOrders, costFor), [periodOrders, costFor]);
  const pendingOrders = useMemo(() => orders.filter((o) => ["new", "confirmed", "packed"].includes(o.status)).length, [orders]);

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

  const spark = useMemo(() => revenueChart.slice(-14), [revenueChart]);

  const today = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const todays = orders.filter((o) => (o.deliveredAt ?? o.createdAt) === todayStr);
    const tp = computePnL(todays, costFor);
    const wb = todays.filter((o) => o.channel === "wildberries").length;
    const ozon = todays.filter((o) => o.channel === "ozon").length;
    const other = todays.length - wb - ozon;
    return { profit: tp.netProfit, revenue: tp.revenue, orders: todays.length, wb, ozon, other };
  }, [orders, costFor]);

  const channelParts = [today.wb && `WB ${today.wb}`, today.ozon && `Ozon ${today.ozon}`, today.other && `прочее ${today.other}`].filter(Boolean).join(" · ");

  const kpis = [
    { label: `Выручка · ${periodCfg.label.toLowerCase()}`, value: `${fmt(pnl.revenue)} ₽`, sub: "реализованные заказы", trend: 0 as number },
    { label: "Чистая прибыль", value: `${fmt(pnl.netProfit)} ₽`, sub: pnl.revenue > 0 ? `маржа ${pnl.netMarginPct.toFixed(1)}%` : "нет данных", trend: pnl.netProfit > 0 ? 1 : pnl.netProfit < 0 ? -1 : 0 },
    { label: "Мало товара", value: String(allLowStock.length), sub: allLowStock.length === 0 ? "всё в норме" : "требуют пополнения", trend: allLowStock.length === 0 ? 1 : -1 },
    { label: "Заказов в работе", value: String(pendingOrders), sub: pendingOrders === 0 ? `${pnl.orderCount} реализовано` : "обрабатываются", trend: 0 },
  ];

  return (
    <div className="space-y-6">

      {/* Hero — today's earnings, Mercury-style balance */}
      <div className="surface p-6 sm:p-7">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <p className="eyebrow">Заработано сегодня</p>
            <p className={cn(
              "metric mt-2 text-[2.5rem] font-semibold leading-none sm:text-[2.75rem]",
              today.profit >= 0 ? "text-[var(--c-text)]" : "text-[var(--c-red)]",
            )}>
              {today.profit < 0 ? "−" : ""}{formatRUB(Math.abs(today.profit))}
            </p>
            <p className="mt-3 text-sm text-[var(--c-text2)]">
              Выручка <span className="font-medium text-[var(--c-text)]">{formatRUB(today.revenue)}</span>
              <span className="mx-2 text-[var(--c-border2)]">|</span>
              {today.orders} {today.orders === 1 ? "заказ" : "заказов"}
              {channelParts && <span className="text-[var(--c-text3)]"> · {channelParts}</span>}
            </p>
          </div>
          <div className="hidden h-16 w-44 shrink-0 sm:block">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={spark} margin={{ top: 6, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="heroSpark" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--c-green)" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="var(--c-green)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="rev" stroke="var(--c-green)" strokeWidth={2} fill="url(#heroSpark)" dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* AI insights */}
      <InsightsPanel />

      {/* Quick actions — mobile */}
      <div className="flex flex-wrap gap-2 lg:hidden">
        {QUICK_ACTIONS.map((a) => (
          <Link key={a.label} href={a.href}
            className="surface-sm surface-hover flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[var(--c-text2)]">
            <a.icon size={14} className="shrink-0" />{a.label}
          </Link>
        ))}
      </div>

      {/* Period control */}
      <div className="inline-flex rounded-full bg-[var(--c-bg3)] p-0.5">
        {PERIODS.map((p) => (
          <button key={p.id} onClick={() => setPeriod(p.id)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-[13px] font-medium transition",
              period === p.id
                ? "bg-[var(--c-bg2)] text-[var(--c-text)] shadow-[var(--shadow-xs)]"
                : "text-[var(--c-text2)] hover:text-[var(--c-text)]",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="surface surface-hover p-5">
            <p className="eyebrow">{k.label}</p>
            <p className="metric mt-2.5 text-[1.6rem] font-semibold leading-none text-[var(--c-text)]">{k.value}</p>
            <p className={cn(
              "mt-2 flex items-center gap-1 text-xs",
              k.trend > 0 ? "text-[var(--c-green)]" : k.trend < 0 ? "text-[var(--c-red)]" : "text-[var(--c-text3)]",
            )}>
              {k.trend > 0 && <ArrowUpRight size={13} />}
              {k.trend < 0 && <ArrowDownRight size={13} />}
              {k.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Revenue chart + P&L */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="surface p-6 lg:col-span-2">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="eyebrow">Выручка</p>
              <p className="metric mt-1.5 text-2xl font-semibold text-[var(--c-text)]">{fmt(pnl.revenue)} ₽</p>
            </div>
            <span className="text-[13px] text-[var(--c-text3)]">за {chartDays} дней</span>
          </div>
          <div className="mt-5">
            <ResponsiveContainer width="100%" height={196}>
              <AreaChart data={revenueChart} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--c-green)" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="var(--c-green)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tick={{ fill: "var(--c-text3)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  interval={Math.max(0, Math.floor(chartDays / 6))}
                  tickFormatter={(d) => new Date(d).toLocaleString("ru-RU", { day: "numeric", month: "short" })}
                />
                <YAxis
                  tick={{ fill: "var(--c-text3)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                  tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}К` : String(v))}
                />
                <Tooltip
                  content={({ active, payload, label }) =>
                    active && payload?.[0] ? (
                      <div className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-2 text-xs shadow-[var(--shadow-md)]">
                        <p className="mb-0.5 text-[var(--c-text3)]">
                          {new Date(label as string).toLocaleString("ru-RU", { day: "numeric", month: "long" })}
                        </p>
                        <p className="metric font-semibold text-[var(--c-text)]">{fmt(payload[0].value as number)} ₽</p>
                      </div>
                    ) : null
                  }
                />
                <Area type="monotone" dataKey="rev" stroke="var(--c-green)" strokeWidth={2} fill="url(#revGrad)" dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* P&L breakdown */}
        <div className="surface p-6">
          <SectionHeader title="Разбивка прибыли" sub="За текущий период" />
          <div className="space-y-3">
            {[
              { label: "Выручка", value: pnl.revenue, sign: "+" as const, strong: true },
              { label: "Себестоимость", value: -pnl.cogs, sign: "−" as const },
              { label: "Комиссии МП", value: -pnl.commission, sign: "−" as const },
              { label: "Логистика", value: -pnl.logistics, sign: "−" as const },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-[var(--c-text2)]">{row.label}</span>
                <span className={cn("metric font-medium", row.strong ? "text-[var(--c-text)]" : "text-[var(--c-text2)]")}>
                  {row.sign} {fmt(Math.abs(row.value))} ₽
                </span>
              </div>
            ))}
            <div className="mt-1 flex items-center justify-between gap-2 border-t border-[var(--c-border)] pt-3">
              <span className="text-sm font-semibold text-[var(--c-text)]">Чистая прибыль</span>
              <span className={cn("metric text-base font-semibold", pnl.netProfit >= 0 ? "text-[var(--c-green)]" : "text-[var(--c-red)]")}>
                {pnl.netProfit >= 0 ? "" : "−"}{fmt(Math.abs(pnl.netProfit))} ₽
              </span>
            </div>
            <Link href="/inventory/finance" className="mt-1 inline-block text-[13px] font-medium text-[var(--c-text2)] transition hover:text-[var(--c-text)]">
              Точный отчёт →
            </Link>
          </div>
        </div>
      </div>

      {/* Attention lists */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="surface p-5">
          <SectionHeader title="Мало товара" sub={allLowStock.length > 0 ? `${allLowStock.length} требуют пополнения` : "Все товары в норме"} href="/inventory/products?stock=low" linkLabel="Все" badge={allLowStock.length} />
          {lowStock.length === 0 ? <ListEmpty message="Все запасы в норме" /> : (
            <div className="-mx-2">
              {lowStock.map((p) => {
                const available = getAvailableStock(p);
                const status = getStockStatus(p);
                return (
                  <Link key={p.id} href={`/inventory/products/${p.id}`} className="flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-[var(--c-bg3)]">
                    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-[var(--c-bg3)] ring-1 ring-[var(--c-border)]">
                      {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-xs">📦</div>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--c-text)]">{p.name}</p>
                      <p className="text-xs text-[var(--c-text3)]">{p.sku}</p>
                    </div>
                    <span className={cn("metric shrink-0 text-sm font-semibold", status === "out_of_stock" ? "text-[var(--c-red)]" : "text-[var(--c-amber)]")}>
                      {available} шт
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="surface p-5">
          <SectionHeader title="Заказы поставщикам" sub={`${activePOs.length} активных`} href="/inventory/purchase-orders" linkLabel="Все" badge={activePOs.filter((po) => po.expectedArrival && new Date(po.expectedArrival) < new Date()).length} />
          {activePOs.length === 0 ? <ListEmpty message="Нет активных заказов" /> : (
            <div className="-mx-2">
              {activePOs.map((po) => {
                const isOverdue = po.expectedArrival && !["closed", "draft"].includes(po.status) && new Date(po.expectedArrival) < new Date();
                return (
                  <Link key={po.id} href={`/inventory/purchase-orders/${po.id}`} className={cn("flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-[var(--c-bg3)]", isOverdue && "bg-[var(--c-red-dim)]")}>
                    {isOverdue && <AlertTriangle size={14} className="shrink-0 text-[var(--c-red)]" />}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[var(--c-text)]">{po.id.toUpperCase()}</p>
                      <p className="truncate text-xs text-[var(--c-text3)]">{po.supplierName}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      {isOverdue ? <p className="text-xs font-medium text-[var(--c-red)]">Просрочен</p> : <POStatusBadge status={po.status} />}
                      <p className="metric mt-0.5 text-xs text-[var(--c-text3)]">{fmt(po.totalAmount)} ₽</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="surface p-5">
          <SectionHeader title="Последние операции" href="/inventory/history" linkLabel="История" />
          {recentMovements.length === 0 ? <ListEmpty message="Операций пока нет" ctaLabel="Синхронизировать маркетплейс" ctaHref="/inventory/settings/integrations" /> : (
            <div className="-mx-2">
              {recentMovements.map((m) => {
                const pos = m.qtyDelta > 0;
                return (
                  <div key={m.id} className="flex items-center gap-3 rounded-lg px-2 py-2">
                    <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold", pos ? "bg-[var(--c-green-dim)] text-[var(--c-green)]" : "bg-[var(--c-red-dim)] text-[var(--c-red)]")}>
                      {pos ? "+" : "−"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--c-text)]">{m.productName}</p>
                      <p className="text-xs text-[var(--c-text3)]">{m.reason ?? m.type} · {formatDate(m.createdAt)}</p>
                    </div>
                    <span className={cn("metric shrink-0 text-sm font-semibold", pos ? "text-[var(--c-green)]" : "text-[var(--c-red)]")}>
                      {pos ? "+" : "−"}{Math.abs(m.qtyDelta)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Active transfers */}
      {activeTransfers.length > 0 && (
        <div className="surface p-5">
          <SectionHeader title="В пути" sub={`${activeTransfers.length} активных перемещений`} href="/inventory/transfers" linkLabel="Все" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {activeTransfers.slice(0, 4).map((t) => (
              <Link key={t.id} href="/inventory/transfers" className="surface-sm surface-hover px-3 py-2.5">
                <p className="text-sm font-medium text-[var(--c-text)]">{t.id.toUpperCase()}</p>
                <p className="mt-0.5 text-xs text-[var(--c-text3)]">{t.items.reduce((s, i) => s + i.qty, 0)} ед.</p>
                <span className="mt-1.5 inline-flex items-center rounded-full bg-[var(--c-amber-dim)] px-2 py-0.5 text-[11px] font-medium text-[var(--c-amber)]">В пути</span>
              </Link>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
