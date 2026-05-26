"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { TrendingUp, ShoppingCart, BarChart2, Percent } from "lucide-react";
import { useInventory } from "@/contexts/InventoryContext";
import { computePnL, computeChannelPnL, computeProductProfit } from "@/lib/inventory/finance";
import { cn } from "@/lib/utils";
import type { Order } from "@/mock/inventory";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return new Intl.NumberFormat("ru-RU").format(Math.round(n));
}

function fmtShort(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} млн`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)} тыс`;
  return String(Math.round(n));
}

// ── Custom Tooltip ─────────────────────────────────────────────────────────────

interface TooltipEntry {
  name: string;
  value: number | string;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
  unit?: string;
}

function CustomTooltip({ active, payload, label, unit = "₽" }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] px-3 py-2 text-xs shadow-lg">
      {label && (
        <p className="mb-1 font-medium text-[var(--c-text)]">{label}</p>
      )}
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}:{" "}
          {typeof p.value === "number"
            ? `${fmt(p.value)} ${unit}`
            : p.value}
        </p>
      ))}
    </div>
  );
}

// ── Channel colours ────────────────────────────────────────────────────────────

const CHANNEL_COLORS: Record<string, string> = {
  wildberries: "#a855f7",
  ozon:        "#0ea5e9",
  yandex_market: "#eab308",
  website:     "#22c55e",
  pos:         "#f59e0b",
  telegram:    "#14b8a6",
};

// ── Order-status colours & labels ──────────────────────────────────────────────

const STATUS_META: { id: Order["status"]; label: string; color: string }[] = [
  { id: "delivered",  label: "Доставлен",    color: "var(--c-green)" },
  { id: "shipped",    label: "Отправлен",    color: "var(--c-blue)" },
  { id: "packed",     label: "Собран",       color: "var(--c-amber)" },
  { id: "confirmed",  label: "Подтверждён",  color: "#6366f1" },
  { id: "new",        label: "Новый",        color: "var(--c-text3)" },
  { id: "cancelled",  label: "Отменён",      color: "var(--c-red)" },
  { id: "returned",   label: "Возврат",      color: "#f97316" },
];

// ── KPI Card ──────────────────────────────────────────────────────────────────

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}

function KpiCard({ icon, label, value, sub, accent }: KpiCardProps) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
      <div
        className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
        style={{ background: accent ? `color-mix(in srgb, ${accent} 15%, transparent)` : "var(--c-bg3)" }}
      >
        <span style={{ color: accent ?? "var(--c-text2)" }}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-xs text-[var(--c-text3)]">{label}</p>
        <p className="mt-0.5 text-lg font-semibold leading-tight text-[var(--c-text)]">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-[var(--c-text3)]">{sub}</p>}
      </div>
    </div>
  );
}

// ── Chart Card wrapper ────────────────────────────────────────────────────────

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

function ChartCard({ title, subtitle, children, footer, className }: ChartCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-5 flex flex-col gap-3",
        className,
      )}
    >
      <div>
        <p className="text-sm font-semibold text-[var(--c-text)]">{title}</p>
        {subtitle && (
          <p className="mt-0.5 text-xs text-[var(--c-text3)]">{subtitle}</p>
        )}
      </div>
      <div className="flex-1">{children}</div>
      {footer && <div className="border-t border-[var(--c-border)] pt-3">{footer}</div>}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function SalesChartPanel() {
  const { orders } = useInventory();

  // ── KPI summary ──────────────────────────────────────────────────────────────
  const pnl = useMemo(() => computePnL(orders), [orders]);

  // ── Chart 1: Revenue by Day (last 30 days) ───────────────────────────────────
  const revenueByDay = useMemo(() => {
    const today = new Date();
    const days = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (29 - i));
      return d.toISOString().split("T")[0];
    });
    return days.map((date) => ({
      date,
      label: new Date(date)
        .toLocaleDateString("ru-RU", { day: "numeric", month: "short" })
        .replace(".", ""),
      revenue: orders
        .filter(
          (o) =>
            o.createdAt === date &&
            (o.status === "shipped" || o.status === "delivered"),
        )
        .reduce((s, o) => s + o.revenue, 0),
    }));
  }, [orders]);

  // ── Chart 2: Revenue by Channel (Pie) ────────────────────────────────────────
  const channelPnl = useMemo(() => computeChannelPnL(orders), [orders]);

  const channelPieData = useMemo(
    () =>
      channelPnl
        .filter((c) => c.revenue > 0)
        .map((c) => ({ name: c.label, value: c.revenue, channel: c.channel })),
    [channelPnl],
  );

  // ── Chart 3: Top 10 products (Horizontal Bar) ────────────────────────────────
  const top10Products = useMemo(() => {
    const list = computeProductProfit(orders)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
    return list.map((p) => ({
      name: p.name.length > 20 ? p.name.slice(0, 20) + "…" : p.name,
      revenue: Math.round(p.revenue),
      profit: Math.round(p.netProfit),
    }));
  }, [orders]);

  // ── Chart 4: Orders by status ────────────────────────────────────────────────
  const statusCounts = useMemo(() => {
    const counts = new Map<Order["status"], number>();
    for (const o of orders) {
      counts.set(o.status, (counts.get(o.status) ?? 0) + 1);
    }
    const maxCount = Math.max(...counts.values(), 1);
    return STATUS_META.map((s) => ({
      ...s,
      count: counts.get(s.id) ?? 0,
      pct: ((counts.get(s.id) ?? 0) / maxCount) * 100,
    })).filter((s) => s.count > 0);
  }, [orders]);

  // ── Channel bar chart (grouped horizontal) ────────────────────────────────────
  const channelBarData = useMemo(
    () =>
      channelPnl
        .filter((c) => c.revenue > 0)
        .map((c) => ({
          name: c.label,
          channel: c.channel,
          revenue: Math.round(c.revenue),
          profit: Math.round(c.netProfit),
        })),
    [channelPnl],
  );

  // ── Total daily revenue for subtitle ─────────────────────────────────────────
  const totalDayRevenue = revenueByDay.reduce((s, d) => s + d.revenue, 0);
  const nonZeroDays = revenueByDay.filter((d) => d.revenue > 0).length;

  return (
    <div className="space-y-6">
      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          icon={<TrendingUp size={18} />}
          label="Выручка (реализовано)"
          value={`${fmt(pnl.revenue)} ₽`}
          sub={`${pnl.orderCount} заказ(ов)`}
          accent="var(--c-green)"
        />
        <KpiCard
          icon={<ShoppingCart size={18} />}
          label="Всего заказов"
          value={String(orders.length)}
          sub={`реализовано: ${pnl.orderCount}`}
          accent="var(--c-blue)"
        />
        <KpiCard
          icon={<BarChart2 size={18} />}
          label="Средний чек"
          value={`${fmt(pnl.avgOrderValue)} ₽`}
          sub="реализованные заказы"
          accent="var(--c-amber)"
        />
        <KpiCard
          icon={<Percent size={18} />}
          label="Чистая маржа"
          value={`${pnl.netMarginPct.toFixed(1)}%`}
          sub={`прибыль ${fmt(pnl.netProfit)} ₽`}
          accent={pnl.netMarginPct >= 0 ? "var(--c-green)" : "var(--c-red)"}
        />
      </div>

      {/* ── Charts Grid ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

        {/* Chart 1: Revenue by Day */}
        <ChartCard
          title="Выручка по дням"
          subtitle={`Последние 30 дней · ${nonZeroDays} дн. с продажами · итого ${fmtShort(totalDayRevenue)} ₽`}
          className="lg:col-span-2"
        >
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={revenueByDay} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--c-border)" />
              <XAxis
                dataKey="label"
                stroke="var(--c-border)"
                tick={{ fill: "var(--c-text3)", fontSize: 10 }}
                tickLine={false}
                interval={4}
              />
              <YAxis
                stroke="var(--c-border)"
                tick={{ fill: "var(--c-text3)", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={fmtShort}
                width={52}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "var(--c-bg3)" }}
              />
              <Bar
                dataKey="revenue"
                name="Выручка"
                fill="var(--c-green)"
                radius={[3, 3, 0, 0]}
                maxBarSize={24}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Chart 2: Revenue by Channel (Pie) */}
        <ChartCard
          title="Выручка по каналам"
          subtitle="Доля каждого канала в реализованной выручке"
          footer={
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              {channelPnl.filter((c) => c.revenue > 0).map((c) => (
                <div key={c.channel} className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full"
                    style={{ background: CHANNEL_COLORS[c.channel] ?? "#888" }}
                  />
                  <span className="truncate text-xs text-[var(--c-text2)]">{c.label}</span>
                  <span className="ml-auto flex-shrink-0 text-xs font-medium text-[var(--c-text)]">
                    {fmt(c.revenue)} ₽
                  </span>
                </div>
              ))}
            </div>
          }
        >
          {channelPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={channelPieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={52}
                  paddingAngle={2}
                >
                  {channelPieData.map((entry) => (
                    <Cell
                      key={entry.channel}
                      fill={CHANNEL_COLORS[entry.channel] ?? "#888"}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) =>
                    typeof value === "number" ? [`${fmt(value)} ₽`, "Выручка"] : [String(value), "Выручка"]
                  }
                  contentStyle={{
                    background: "var(--c-bg3)",
                    border: "1px solid var(--c-border)",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "var(--c-text)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[220px] items-center justify-center text-sm text-[var(--c-text3)]">
              Нет данных
            </div>
          )}
        </ChartCard>

        {/* Chart 3: Top 10 Products */}
        <ChartCard
          title="Топ-10 товаров по выручке"
          subtitle="Выручка и чистая прибыль по товарам (реализованные заказы)"
        >
          {top10Products.length > 0 ? (
            <div className="space-y-0">
              {/* header */}
              <div className="grid grid-cols-[1fr_80px_80px] gap-2 px-1 pb-2 text-[11px] font-medium uppercase tracking-wide text-[var(--c-text3)]">
                <span>Товар</span>
                <span className="text-right">Выручка</span>
                <span className="text-right">Прибыль</span>
              </div>
              {(() => {
                const maxRev = Math.max(...top10Products.map((p) => p.revenue), 1);
                return top10Products.map((p, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[1fr_80px_80px] items-center gap-2 rounded-md px-1 py-2 hover:bg-[var(--c-bg3)] transition"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm text-[var(--c-text)]">{p.name}</p>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--c-bg3)]">
                        <div
                          className="h-full rounded-full bg-[var(--c-blue)]"
                          style={{ width: `${(p.revenue / maxRev) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-right text-sm tabular text-[var(--c-text)]">{fmt(p.revenue)} ₽</span>
                    <span className={`text-right text-sm tabular ${p.profit >= 0 ? "text-[var(--c-green)]" : "text-[var(--c-red)]"}`}>
                      {p.profit >= 0 ? "" : "−"}{fmt(Math.abs(p.profit))} ₽
                    </span>
                  </div>
                ));
              })()}
            </div>
          ) : (
            <div className="flex h-[220px] items-center justify-center text-sm text-[var(--c-text3)]">
              Нет данных
            </div>
          )}
        </ChartCard>

        {/* Chart 4: Status distribution */}
        <ChartCard
          title="Статусы заказов"
          subtitle={`Всего заказов: ${orders.length}`}
        >
          <div className="space-y-3 pt-1">
            {statusCounts.map((s) => (
              <div key={s.id}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs text-[var(--c-text2)]">{s.label}</span>
                  <span className="text-xs font-medium text-[var(--c-text)]">
                    {s.count}{" "}
                    <span className="font-normal text-[var(--c-text3)]">
                      ({((s.count / orders.length) * 100).toFixed(0)}%)
                    </span>
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--c-bg3)]">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${s.pct}%`,
                      background: s.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Channel breakdown summary */}
          <div className="mt-4 border-t border-[var(--c-border)] pt-3">
            <p className="mb-2 text-xs font-medium text-[var(--c-text2)]">
              Прибыль по каналам
            </p>
            <div className="space-y-1.5">
              {channelBarData.map((c) => (
                <div key={c.channel} className="flex items-center gap-2">
                  <span
                    className="inline-block h-2 w-2 flex-shrink-0 rounded-full"
                    style={{ background: CHANNEL_COLORS[c.channel] ?? "#888" }}
                  />
                  <span className="min-w-0 flex-1 truncate text-xs text-[var(--c-text2)]">
                    {c.name}
                  </span>
                  <span
                    className="flex-shrink-0 text-xs font-medium"
                    style={{ color: c.profit >= 0 ? "var(--c-green)" : "var(--c-red)" }}
                  >
                    {c.profit >= 0 ? "+" : ""}
                    {fmt(c.profit)} ₽
                  </span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>

      </div>
    </div>
  );
}
