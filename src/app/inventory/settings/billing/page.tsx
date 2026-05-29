"use client";

import { useMemo } from "react";
import { Check, Zap, AlertTriangle } from "lucide-react";
import { useInventory } from "@/contexts/InventoryContext";
import { PLANS, computeUsage, getPlan, type PlanId } from "@/lib/billing/plans";
import { cn, formatRub } from "@/lib/utils";

// The active plan would normally come from org_settings; default to free.
const CURRENT_PLAN: PlanId = "free";

function startOfMonth(): number {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}

export default function SettingsBillingPage() {
  const { products, orders, staff, locations } = useInventory();

  const usage = useMemo(() => {
    const monthStart = startOfMonth();
    const ordersThisMonth = orders.filter(
      (o) => new Date(o.createdAt).getTime() >= monthStart,
    ).length;
    return {
      products: products.length,
      ordersPerMonth: ordersThisMonth,
      staff: staff.length,
      locations: locations.length,
      integrations: 0,
    };
  }, [products, orders, staff, locations]);

  const plan = getPlan(CURRENT_PLAN);
  const metrics = useMemo(() => computeUsage(plan, usage), [plan, usage]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--c-text)]">Биллинг</h1>
        <p className="mt-0.5 text-sm text-[var(--c-text2)]">Тарифный план и использование</p>
      </div>

      {/* Current plan + usage */}
      <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-[var(--c-text3)]">Текущий тариф</p>
            <p className="mt-0.5 text-lg font-bold text-[var(--c-text)]">{plan.name}</p>
          </div>
          <span className="flex items-center gap-1.5 rounded-full border border-[rgba(34,197,94,0.3)] bg-[var(--c-green-dim)] px-3 py-1 text-xs font-medium text-[var(--c-green)]">
            <Check size={12} /> Активен
          </span>
        </div>

        <div className="mt-5 space-y-3">
          {metrics.map((m) => (
            <div key={m.key}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-[var(--c-text2)]">{m.label}</span>
                <span className={cn("tabular", m.overLimit ? "text-[var(--c-red)]" : "text-[var(--c-text)]")}>
                  {m.used}
                  {m.limit < 0 ? " / ∞" : ` / ${m.limit}`}
                  {m.overLimit && <AlertTriangle className="ml-1 inline h-3.5 w-3.5" />}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--c-bg3)]">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    m.overLimit ? "bg-[var(--c-red)]" : m.ratio > 0.8 ? "bg-[var(--c-amber)]" : "bg-[var(--c-green)]",
                  )}
                  style={{ width: `${Math.round((m.limit < 0 ? 0.04 : m.ratio) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Plan comparison */}
      <div className="grid gap-4 md:grid-cols-3">
        {PLANS.map((p) => {
          const isCurrent = p.id === CURRENT_PLAN;
          return (
            <div
              key={p.id}
              className={cn(
                "flex flex-col rounded-xl border bg-[var(--c-bg2)] p-5",
                isCurrent ? "border-[var(--c-blue)]" : "border-[var(--c-border)]",
              )}
            >
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-[var(--c-text)]">{p.name}</h3>
                {p.id === "business" && <Zap className="h-4 w-4 text-[var(--c-amber)]" />}
              </div>
              <p className="mt-1 text-xs text-[var(--c-text3)]">{p.tagline}</p>
              <p className="mt-3 text-2xl font-bold text-[var(--c-text)]">
                {p.priceMonthly === 0 ? "0 ₽" : formatRub(p.priceMonthly)}
                <span className="text-sm font-normal text-[var(--c-text3)]">/мес</span>
              </p>
              <ul className="mt-4 flex-1 space-y-2 text-sm text-[var(--c-text2)]">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check size={14} className="mt-0.5 shrink-0 text-[var(--c-green)]" /> {f}
                  </li>
                ))}
              </ul>
              <button
                disabled={isCurrent}
                className={cn(
                  "mt-5 rounded-lg px-4 py-2 text-sm font-medium transition",
                  isCurrent
                    ? "cursor-default border border-[var(--c-border)] text-[var(--c-text3)]"
                    : "bg-[var(--c-blue)] text-white hover:opacity-90",
                )}
              >
                {isCurrent ? "Текущий тариф" : "Перейти"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
