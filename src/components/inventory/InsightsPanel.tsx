"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Sparkles, RefreshCw, AlertTriangle, Info } from "lucide-react";
import { useInventory } from "@/contexts/InventoryContext";
import { computePnL, costLookupFromProducts } from "@/lib/inventory/finance";
import { upcomingEvents } from "@/lib/inventory/seasonality";
import { getStockStatus } from "@/mock/inventory";
import type { Insight, InsightSummary } from "@/lib/ai/insights";

/** AI-generated insight cards. Calls the server route which talks to
 *  YandexGPT; gracefully shows an empty state when no key is configured. */
export function InsightsPanel() {
  const { products, orders } = useInventory();
  const [state, setState] = useState<{ loading: boolean; configured?: boolean; insights: Insight[]; error?: string }>({ loading: false, insights: [] });

  const summary: InsightSummary = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const costFor = costLookupFromProducts(products);
    const since30 = new Date(); since30.setDate(since30.getDate() - 30);
    const since60 = new Date(); since60.setDate(since60.getDate() - 60);
    const last30 = orders.filter((o) => (o.deliveredAt ?? o.createdAt) >= since30.toISOString().slice(0, 10));
    const prev30 = orders.filter((o) => {
      const d = o.deliveredAt ?? o.createdAt;
      return d >= since60.toISOString().slice(0, 10) && d < since30.toISOString().slice(0, 10);
    });
    const todayOrders = orders.filter((o) => (o.deliveredAt ?? o.createdAt) === todayStr);
    const pnl30 = computePnL(last30, costFor);
    const pnlPrev = computePnL(prev30, costFor);
    const todayPnl = computePnL(todayOrders, costFor);

    const stockStatuses = products.filter((p) => p.status === "active").map((p) => getStockStatus(p));
    const outOfStock = stockStatuses.filter((s) => s === "out_of_stock").length;
    const lowStock = stockStatuses.filter((s) => s === "low_stock").length;
    const productsWithoutCost = products.filter((p) => p.status === "active" && (p.costPrice ?? 0) <= 0).length;

    const byChannel = new Map<string, number>();
    for (const o of last30) {
      if (o.status === "shipped" || o.status === "delivered") {
        byChannel.set(o.channel, (byChannel.get(o.channel) ?? 0) + o.revenue);
      }
    }
    const channels = [...byChannel.entries()].map(([name, revenue]) => ({ name, revenue }));

    const events = upcomingEvents(new Date(), 30).slice(0, 4).map((e) => ({
      name: e.event.name, daysUntil: e.daysUntil, hint: e.event.hint,
    }));

    return {
      revenue30d: pnl30.revenue,
      prevRevenue30d: pnlPrev.revenue,
      orderCount30d: pnl30.orderCount,
      realizedToday: { revenue: todayPnl.revenue, orders: todayPnl.orderCount },
      outOfStock, lowStock, productsWithoutCost,
      channels,
      upcomingEvents: events,
    };
  }, [products, orders]);

  const fetchInsights = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: undefined }));
    try {
      const res = await fetch("/api/ai/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(summary),
      });
      const d = await res.json() as {
        ok: boolean; configured?: boolean; insights?: Insight[]; message?: string;
      };
      setState({ loading: false, configured: d.configured, insights: d.insights ?? [], error: d.ok ? undefined : d.message });
    } catch (e) {
      setState({ loading: false, insights: [], error: e instanceof Error ? e.message : "Ошибка" });
    }
  }, [summary]);

  useEffect(() => { void fetchInsights(); }, [fetchInsights]);

  const sevCls: Record<Insight["severity"], string> = {
    info: "border-[var(--c-border)] bg-[var(--c-bg2)]",
    warning: "border-[rgba(245,166,35,0.4)] bg-[var(--c-amber-dim)]",
    critical: "border-[rgba(239,68,68,0.4)] bg-[rgba(239,68,68,0.08)]",
  };
  const sevIcon: Record<Insight["severity"], React.ReactNode> = {
    info: <Info size={14} className="text-[var(--c-text3)]" />,
    warning: <AlertTriangle size={14} className="text-[var(--c-amber)]" />,
    critical: <AlertTriangle size={14} className="text-[var(--c-red)]" />,
  };

  return (
    <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-[var(--c-green)]" />
          <h2 className="text-sm font-semibold text-[var(--c-text)]">AI-инсайты</h2>
        </div>
        <button onClick={fetchInsights} disabled={state.loading}
          className="flex items-center gap-1.5 text-xs font-medium text-[var(--c-text2)] hover:text-[var(--c-text)] disabled:opacity-50">
          <RefreshCw size={12} className={state.loading ? "animate-spin" : ""} /> Обновить
        </button>
      </div>

      {state.configured === false && (
        <div className="flex items-start gap-2 rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] p-3 text-xs text-[var(--c-text2)]">
          <Info size={14} className="mt-0.5 shrink-0 text-[var(--c-text3)]" />
          <div>
            Подключите YandexGPT в переменных окружения (<code className="font-mono">YANDEX_AI_API_KEY</code>{" "}
            и <code className="font-mono">YANDEX_FOLDER_ID</code>), чтобы получать автоматические рекомендации по выручке, остаткам, ценам и сезонности.
          </div>
        </div>
      )}

      {state.configured !== false && state.loading && state.insights.length === 0 && (
        <div className="py-6 text-center text-sm text-[var(--c-text3)]">Анализирую данные…</div>
      )}

      {state.configured !== false && !state.loading && state.insights.length === 0 && !state.error && (
        <div className="py-6 text-center text-sm text-[var(--c-text3)]">
          Пока недостаточно данных для AI-выводов. Они появятся, как только накопится история продаж и остатков.
        </div>
      )}

      {state.error && (
        <p className="text-xs text-[var(--c-red)]">{state.error}</p>
      )}

      {state.insights.length > 0 && (
        <div className="space-y-3">
          {state.insights.map((i, idx) => (
            <div key={idx} className={`flex items-start gap-3 rounded-lg border p-3 ${sevCls[i.severity]}`}>
              <span className="mt-0.5 shrink-0">{sevIcon[i.severity]}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[var(--c-text)]">{i.headline}</p>
                <p className="mt-0.5 text-xs text-[var(--c-text2)] leading-relaxed">{i.body}</p>
                {i.action?.label && i.action.href && (
                  <Link href={i.action.href} className="mt-2 inline-flex text-xs font-medium text-[var(--c-green)] hover:opacity-80">
                    {i.action.label} →
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
