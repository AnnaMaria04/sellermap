"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import {
  LineChart, Line, ResponsiveContainer,
} from "recharts";
import { useInventory } from "@/contexts/InventoryContext";
import { MetricInfo } from "./MetricInfo";
import { METRICS, computeOrderStats, salesOverTime } from "@/lib/analytics/metrics";
import { resolvePreset, formatMoney, DEFAULT_CURRENCY, type PresetId } from "@/lib/analytics/date-range";
import { cn } from "@/lib/utils";

const SCOPES: { id: PresetId; label: string; sub: string }[] = [
  { id: "today", label: "Сегодня", sub: "В сравнении со вчера до текущего часа" },
  { id: "last7", label: "Последние 7 дней", sub: "В сравнении с предыдущими 7 днями" },
  { id: "last30", label: "Последние 30 дней", sub: "В сравнении с предыдущими 30 днями" },
];

/** The Shopify-style analytics bar shown above the Orders table. */
export function OrdersAnalyticsBar() {
  const { orders, returns } = useInventory();
  const [scope, setScope] = useState<PresetId>("today");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const range = useMemo(() => resolvePreset(scope), [scope]);
  const stats = useMemo(() => computeOrderStats(orders, returns, range.start, range.end), [orders, returns, range]);
  const spark = useMemo(() => salesOverTime(orders, range.start, range.end), [orders, range]);
  const scopeLabel = SCOPES.find((s) => s.id === scope)!.label;

  const fulfillment =
    stats.fulfillmentHours == null
      ? "—"
      : stats.fulfillmentHours < 24
        ? `${stats.fulfillmentHours.toFixed(1)} ч`
        : `${(stats.fulfillmentHours / 24).toFixed(1)} дн`;

  const cells: { metricKey: string; value: string }[] = [
    { metricKey: "orders", value: String(stats.orders) },
    { metricKey: "itemsOrdered", value: String(stats.itemsOrdered) },
    { metricKey: "returns", value: formatMoney(stats.returnsValue, DEFAULT_CURRENCY) },
    { metricKey: "ordersFulfilled", value: String(stats.ordersFulfilled) },
    { metricKey: "ordersDelivered", value: String(stats.ordersDelivered) },
  ];

  return (
    <div className="mb-4 flex flex-wrap items-stretch gap-x-8 gap-y-4 rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg2)] px-4 py-3">
      {/* Scope pill */}
      <div ref={ref} className="relative flex items-center">
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium text-[var(--c-text)] transition",
            open ? "border-[var(--c-blue)] ring-1 ring-[var(--c-blue)]" : "border-[var(--c-border)] hover:bg-[var(--c-bg2)]",
          )}
        >
          <CalendarIcon className="h-4 w-4 text-[var(--c-text2)]" />
          {scopeLabel}
          <ChevronDown className={cn("h-3.5 w-3.5 text-[var(--c-text3)] transition", open && "rotate-180")} />
        </button>
        {open && (
          <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-1.5 shadow-xl">
            {SCOPES.map((s) => (
              <button
                key={s.id}
                onClick={() => { setScope(s.id); setOpen(false); }}
                className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-[var(--c-bg3)]"
              >
                <span className={cn(
                  "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                  scope === s.id ? "border-[var(--c-text)]" : "border-[var(--c-border2)]",
                )}>
                  {scope === s.id && <span className="h-2 w-2 rounded-full bg-[var(--c-text)]" />}
                </span>
                <span>
                  <span className="block text-sm font-medium text-[var(--c-text)]">{s.label}</span>
                  <span className="block text-xs text-[var(--c-text3)]">{s.sub}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Metric cells */}
      {cells.map((c) => (
        <div key={c.metricKey} className="min-w-[120px]">
          <MetricInfo metric={METRICS[c.metricKey]} className="text-sm" />
          <div className="mt-1 flex items-center gap-1.5">
            <span className="text-base font-semibold text-[var(--c-text)]">{c.value}</span>
            <span className="text-[var(--c-text3)]">—</span>
          </div>
        </div>
      ))}

      {/* Fulfillment time with sparkline */}
      <div className="min-w-[160px] flex-1">
        <MetricInfo metric={METRICS.orderToFulfillment} className="text-sm" />
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="text-base font-semibold text-[var(--c-text)]">{fulfillment}</span>
          <div className="h-6 w-24">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={spark}>
                <Line type="monotone" dataKey="value" stroke="#1f6feb" strokeWidth={1.5} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
