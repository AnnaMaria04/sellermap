"use client";

import { useState } from "react";
import { InventoryShell } from "@/components/inventory/InventoryShell";
import { InventoryAnalytics } from "@/components/inventory/InventoryAnalytics";
import { DemandForecast } from "@/components/inventory/DemandForecast";
import { WriteOffPanel } from "@/components/inventory/WriteOffPanel";
import { cn } from "@/lib/utils";

type Tab = "overview" | "forecast" | "writeoffs";

export default function InventoryAnalyticsPage() {
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <InventoryShell
      title="Аналитика"
      subtitle="Анализ запасов, оборачиваемости и рекомендации"
    >
      {/* Sub-tabs */}
      <div className="mb-6 flex gap-1 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-1">
        {[
          { id: "overview", label: "Обзор и KPI" },
          { id: "forecast", label: "Прогноз спроса" },
          { id: "writeoffs", label: "Списания" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as Tab)}
            className={cn(
              "flex-1 rounded-lg py-2 text-sm font-medium transition",
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
      {tab === "forecast" && <DemandForecast />}
      {tab === "writeoffs" && <WriteOffPanel />}
    </InventoryShell>
  );
}
