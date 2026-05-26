"use client";

import { useState } from "react";
import { InventoryShell } from "@/components/inventory/InventoryShell";
import { InventoryAnalytics } from "@/components/inventory/InventoryAnalytics";
import { DemandForecast } from "@/components/inventory/DemandForecast";
import { WriteOffPanel } from "@/components/inventory/WriteOffPanel";
import { CostAnalysisPanel } from "@/components/inventory/CostAnalysisPanel";
import { ReplenishmentRules } from "@/components/inventory/ReplenishmentRules";
import { ExpiryTracker } from "@/components/inventory/ExpiryTracker";
import { TurnoverAnalysis } from "@/components/inventory/TurnoverAnalysis";
import { SalesChartPanel } from "@/components/inventory/SalesChartPanel";
import { cn } from "@/lib/utils";

type Tab = "sales" | "inventory" | "planning" | "quality";

const TABS: { id: Tab; label: string; description: string }[] = [
  { id: "sales",     label: "Продажи",    description: "Графики выручки, топ товаров, каналы" },
  { id: "inventory", label: "Запасы",     description: "KPI, оборачиваемость, маржа" },
  { id: "planning",  label: "Планирование", description: "Прогноз спроса, правила пополнения" },
  { id: "quality",   label: "Операции",   description: "Себестоимость, сроки годности, списания" },
];

export default function InventoryAnalyticsPage() {
  const [tab, setTab] = useState<Tab>("sales");

  return (
    <InventoryShell title="Аналитика">
      {/* Tab bar — 4 tabs, Shopify-style underline */}
      <div className="mb-6 border-b border-[var(--c-border)]">
        <div className="flex gap-0 overflow-x-auto hide-scrollbar">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex-shrink-0 border-b-2 px-5 py-3 text-sm font-medium transition whitespace-nowrap",
                tab === t.id
                  ? "border-[var(--c-text)] text-[var(--c-text)]"
                  : "border-transparent text-[var(--c-text2)] hover:text-[var(--c-text)]",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "sales" && <SalesChartPanel />}
      {tab === "inventory" && (
        <div className="space-y-8">
          <InventoryAnalytics />
          <TurnoverAnalysis />
        </div>
      )}
      {tab === "planning" && (
        <div className="space-y-8">
          <DemandForecast />
          <ReplenishmentRules />
        </div>
      )}
      {tab === "quality" && (
        <div className="space-y-8">
          <CostAnalysisPanel />
          <ExpiryTracker />
          <WriteOffPanel />
        </div>
      )}
    </InventoryShell>
  );
}
