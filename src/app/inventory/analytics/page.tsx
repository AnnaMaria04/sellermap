"use client";

import { InventoryShell } from "@/components/inventory/InventoryShell";
import { AnalyticsDashboard } from "@/components/analytics/AnalyticsDashboard";

export default function AnalyticsPage() {
  return (
    <InventoryShell title="Аналитика" subtitle="Обзор продаж и эффективности магазина">
      <AnalyticsDashboard />
    </InventoryShell>
  );
}
