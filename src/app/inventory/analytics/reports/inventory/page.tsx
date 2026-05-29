"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { InventoryShell } from "@/components/inventory/InventoryShell";
import { InventoryAnalytics } from "@/components/inventory/InventoryAnalytics";
import { DemandForecast } from "@/components/inventory/DemandForecast";
import { SeasonalityPanel } from "@/components/inventory/SeasonalityPanel";
import { WriteOffPanel } from "@/components/inventory/WriteOffPanel";
import { CostAnalysisPanel } from "@/components/inventory/CostAnalysisPanel";
import { ReplenishmentRules } from "@/components/inventory/ReplenishmentRules";
import { ReplenishmentEnginePanel } from "@/components/inventory/ReplenishmentEnginePanel";
import { ExpiryTracker } from "@/components/inventory/ExpiryTracker";
import { TurnoverAnalysis } from "@/components/inventory/TurnoverAnalysis";
import { SalesChartPanel } from "@/components/inventory/SalesChartPanel";
import { cn } from "@/lib/utils";

type Tab = "sales" | "inventory" | "planning" | "quality";

const TABS: { id: Tab; label: string }[] = [
  { id: "sales",     label: "Продажи" },
  { id: "inventory", label: "Запасы" },
  { id: "planning",  label: "Планирование" },
  { id: "quality",   label: "Операции" },
];

/**
 * Curated inventory-analytics hub. Surfaced as a report from the Reports list so
 * the planning/turnover/cost panels stay reachable after the list-view rebuild.
 */
export default function InventoryReportsHubPage() {
  const [tab, setTab] = useState<Tab>("sales");

  return (
    <InventoryShell
      title="Отчёты по запасам"
      subtitle="Продажи, оборачиваемость, планирование и операции"
      actions={
        <Link
          href="/inventory/analytics/reports"
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-1.5 text-sm font-medium text-[var(--c-text)] transition hover:bg-[var(--c-bg)]"
        >
          <ArrowLeft className="h-4 w-4" /> К отчётам
        </Link>
      }
    >
      <div className="mb-6 border-b border-[var(--c-border)]">
        <div className="hide-scrollbar flex gap-0 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex-shrink-0 whitespace-nowrap border-b-2 px-5 py-3 text-sm font-medium transition",
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
          <SeasonalityPanel />
          <DemandForecast />
          <ReplenishmentEnginePanel />
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
