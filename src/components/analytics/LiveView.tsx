"use client";

import { useMemo } from "react";
import { Globe } from "lucide-react";
import { useInventory } from "@/contexts/InventoryContext";
import { MetricInfo } from "./MetricInfo";
import { METRICS, computeSalesTotals } from "@/lib/analytics/metrics";
import { resolvePreset, formatMoney, DEFAULT_CURRENCY } from "@/lib/analytics/date-range";
import { cn } from "@/lib/utils";

/** Real-time operational view (reference design "Live View"). */
export function LiveView() {
  const { orders, returns } = useInventory();
  const today = useMemo(() => resolvePreset("today"), []);
  const totals = useMemo(
    () => computeSalesTotals(orders, returns, today.start, today.end),
    [orders, returns, today],
  );
  const money = (n: number) => formatMoney(n, DEFAULT_CURRENCY);

  const stat = (label: string, value: string, metricKey?: string) => (
    <div className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg)] p-4">
      {metricKey ? <MetricInfo metric={METRICS[metricKey]} className="text-sm" /> : (
        <span className="text-sm font-semibold text-[var(--c-text)] underline decoration-dotted decoration-[var(--c-text3)] underline-offset-4">{label}</span>
      )}
      <div className="mt-1 text-2xl font-bold text-[var(--c-text)]">{value}</div>
    </div>
  );

  const NoData = () => (
    <div className="flex h-28 items-center justify-center text-sm text-[var(--c-text3)]">Нет данных за этот период</div>
  );

  return (
    <div className="mx-auto max-w-md space-y-3">
      {/* Red top accent like the reference */}
      <div className="h-1 rounded-full bg-[var(--c-red)]" />
      <div className="flex items-center gap-2">
        <Globe className="h-5 w-5 text-[var(--c-text)]" />
        <h2 className="text-lg font-semibold text-[var(--c-text)]">В реальном времени</h2>
        <span className="flex items-center gap-1.5 text-sm text-[var(--c-text2)]">
          <span className="h-2 w-2 rounded-full bg-[var(--c-blue)]" /> Только что
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {stat("Посетителей сейчас", "0")}
        {stat("Итоговые продажи", money(totals.totalSales))}
        {stat("Сеансы", "0")}
        {stat("Заказы", String(totals.orders), "orders")}
      </div>

      <div className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg)] p-4">
        <span className="text-sm font-semibold text-[var(--c-text)] underline decoration-dotted decoration-[var(--c-text3)] underline-offset-4">Поведение клиентов</span>
        <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
          {[["Активные корзины", 0], ["Оформляют", 0], ["Купили", totals.orders]].map(([l, v]) => (
            <div key={l as string}>
              <div className="text-[var(--c-text2)]">{l}</div>
              <div className="mt-1 text-lg font-semibold text-[var(--c-text)]">{v}</div>
            </div>
          ))}
        </div>
      </div>

      {[
        ["Сеансы по регионам"],
        ["Новые и вернувшиеся клиенты"],
        ["Продажи по товарам"],
      ].map(([title]) => (
        <div key={title} className={cn("rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg)] p-4")}>
          <span className="text-sm font-semibold text-[var(--c-text)] underline decoration-dotted decoration-[var(--c-text3)] underline-offset-4">{title}</span>
          <NoData />
        </div>
      ))}
    </div>
  );
}
