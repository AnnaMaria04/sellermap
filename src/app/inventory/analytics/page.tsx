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
import { cn } from "@/lib/utils";

type Tab = "overview" | "turnover" | "forecast" | "cost" | "replenishment" | "expiry" | "writeoffs";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Обзор и KPI" },
  { id: "turnover", label: "Оборачиваемость" },
  { id: "forecast", label: "Прогноз спроса" },
  { id: "cost", label: "Себестоимость" },
  { id: "replenishment", label: "Пополнение" },
  { id: "expiry", label: "Сроки годности" },
  { id: "writeoffs", label: "Списания" },
];

export default function InventoryAnalyticsPage() {
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <InventoryShell
      title="Аналитика"
      subtitle="Анализ запасов, оборачиваемости и рекомендации"
    >
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-1 hide-scrollbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex-shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition whitespace-nowrap",
              tab === t.id
                ? "bg-[var(--c-bg3)] text-[var(--c-text)]"
                : "text-[var(--c-text2)] hover:text-[var(--c-text)]",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && <InventoryAnalytics />}
      {tab === "turnover" && <TurnoverAnalysis />}
      {tab === "forecast" && <DemandForecast />}
      {tab === "cost" && <CostAnalysisPanel />}
      {tab === "replenishment" && <ReplenishmentRules />}
      {tab === "expiry" && <ExpiryTracker />}
      {tab === "writeoffs" && <WriteOffPanel />}
    </InventoryShell>
  );
}
