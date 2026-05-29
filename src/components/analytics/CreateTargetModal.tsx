"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { useInventory } from "@/contexts/InventoryContext";
import { METRICS, computeSalesTotals, type SalesTotals } from "@/lib/analytics/metrics";
import { resolvePreset, formatMoney, DEFAULT_CURRENCY } from "@/lib/analytics/date-range";
import { addTarget, type AnalyticsTarget } from "@/lib/analytics/targets";
import { cn } from "@/lib/utils";

const TARGET_METRICS = ["totalSales", "grossSales", "netSales", "orders", "averageOrderValue", "returningCustomerRate"] as const;
const PERCENT_METRICS = new Set(["returningCustomerRate"]);
const COUNT_METRICS = new Set(["orders"]);

function currentMonthLabel(): string {
  return new Date().toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
}

function metricCurrentValue(totals: SalesTotals, metric: string): number {
  switch (metric) {
    case "grossSales": return totals.grossSales;
    case "netSales": return totals.netSales;
    case "orders": return totals.orders;
    case "averageOrderValue": return totals.averageOrderValue;
    case "returningCustomerRate": return totals.returningCustomerRate;
    default: return totals.totalSales;
  }
}

/** Half-circle progress gauge. */
function Gauge({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(100, pct));
  const r = 70;
  const circ = Math.PI * r; // semicircle length
  const offset = circ * (1 - clamped / 100);
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 180 100" className="w-44">
        <path d="M 20 90 A 70 70 0 0 1 160 90" fill="none" stroke="var(--c-bg3)" strokeWidth={12} strokeLinecap="round" />
        <path
          d="M 20 90 A 70 70 0 0 1 160 90" fill="none" stroke="var(--c-blue)" strokeWidth={12} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
        />
      </svg>
      <div className="-mt-6 text-2xl font-bold text-[var(--c-text)]">{Number.isFinite(pct) ? `${clamped.toFixed(0)}%` : "—%"}</div>
    </div>
  );
}

export function CreateTargetModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { orders, returns } = useInventory();
  const [metric, setMetric] = useState<string>("totalSales");
  const [amount, setAmount] = useState<string>("0");
  const [name, setName] = useState<string>(`Цель на ${new Date().toLocaleDateString("ru-RU", { month: "long" })}`);
  const [onDashboard, setOnDashboard] = useState(true);

  const period = useMemo(() => resolvePreset("month_to_date"), []);
  const totals = useMemo(() => computeSalesTotals(orders, returns, period.start, period.end), [orders, returns, period]);
  const current = metricCurrentValue(totals, metric);
  const target = parseFloat(amount) || 0;
  const pct = target > 0 ? (current / target) * 100 : NaN;

  const fmt = (n: number) =>
    PERCENT_METRICS.has(metric) ? `${n.toFixed(1)}%` : COUNT_METRICS.has(metric) ? n.toLocaleString("ru-RU") : formatMoney(n, DEFAULT_CURRENCY);

  function save() {
    const t: AnalyticsTarget = {
      id: `tgt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      metric, amount: target, period: currentMonthLabel(), name: name.trim() || "Цель", onDashboard,
      createdAt: new Date().toISOString(),
    };
    addTarget(t);
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-12" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg2)] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[var(--c-border)] px-5 py-3.5">
          <h2 className="text-base font-semibold text-[var(--c-text)]">Создать цель</h2>
          <button onClick={onClose} className="rounded p-1 text-[var(--c-text3)] hover:bg-[var(--c-bg3)]"><X className="h-4 w-4" /></button>
        </div>

        <div className="grid grid-cols-1 gap-4 px-5 py-4 sm:grid-cols-2">
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-sm text-[var(--c-text)]">Показатель</span>
              <select value={metric} onChange={(e) => setMetric(e.target.value)} className="w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-2.5 py-2 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-blue)]">
                {TARGET_METRICS.map((m) => <option key={m} value={m}>{METRICS[m].title}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-[var(--c-text)]">Целевое значение</span>
              <input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-2.5 py-2 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-blue)]" />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-[var(--c-text)]">Период</span>
              <input value={currentMonthLabel()} readOnly className="w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] px-2.5 py-2 text-sm text-[var(--c-text2)] outline-none" />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-[var(--c-text)]">Название цели</span>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-2.5 py-2 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-blue)]" />
            </label>
            <label className="flex cursor-pointer items-center justify-between gap-2">
              <span className="text-sm text-[var(--c-text)]">Добавить на дашборд</span>
              <button
                type="button" role="switch" aria-checked={onDashboard} onClick={() => setOnDashboard((v) => !v)}
                className={cn("relative h-6 w-11 rounded-full transition", onDashboard ? "bg-[var(--c-green)]" : "bg-[var(--c-bg3)]")}
              >
                <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all", onDashboard ? "left-[22px]" : "left-0.5")} />
              </button>
            </label>
          </div>

          <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--c-border)] bg-[var(--c-bg)] p-4">
            <span className="mb-2 text-xs font-medium uppercase text-[var(--c-text3)]">Предпросмотр</span>
            <Gauge pct={pct} />
            <div className="mt-3 text-center text-sm">
              <div className="text-[var(--c-text)]">{fmt(current)} <span className="text-[var(--c-text3)]">из</span> {fmt(target)}</div>
              <div className="mt-0.5 text-xs text-[var(--c-text3)]">{METRICS[metric].title} · {currentMonthLabel()}</div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-[var(--c-border)] px-5 py-3">
          <a href="#" className="text-sm text-[var(--c-blue)] hover:underline" onClick={(e) => e.preventDefault()}>Подробнее о целях</a>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-lg border border-[var(--c-border)] px-4 py-1.5 text-sm font-medium text-[var(--c-text)] hover:bg-[var(--c-bg)]">Отмена</button>
            <button onClick={save} className="rounded-lg bg-[var(--c-text)] px-4 py-1.5 text-sm font-medium text-[var(--c-bg)] hover:opacity-90">Сохранить на дашборд</button>
          </div>
        </div>
      </div>
    </div>
  );
}
