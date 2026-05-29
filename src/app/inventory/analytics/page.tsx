"use client";

import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { InventoryShell } from "@/components/inventory/InventoryShell";
import { AnalyticsDashboard } from "@/components/analytics/AnalyticsDashboard";

function nowTime() {
  return new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

export default function AnalyticsPage() {
  const [refreshed] = useState(nowTime);

  return (
    <InventoryShell
      title="Аналитика"
      subtitle={`Обновлено: ${refreshed}`}
      actions={
        <div className="flex items-center gap-2">
          <button className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] p-2 text-[var(--c-text2)] transition hover:bg-[var(--c-bg2)]">
            <MoreHorizontal className="h-4 w-4" />
          </button>
          <button className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] px-3 py-1.5 text-sm font-medium text-[var(--c-text)] transition hover:bg-[var(--c-bg2)]">
            Создать цель
          </button>
          <button className="rounded-lg bg-[var(--c-text)] px-3 py-1.5 text-sm font-medium text-[var(--c-bg)] transition hover:opacity-90">
            Новое исследование
          </button>
        </div>
      }
    >
      <AnalyticsDashboard />
    </InventoryShell>
  );
}
