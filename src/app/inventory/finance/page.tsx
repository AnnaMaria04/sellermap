"use client";

import { InventoryShell } from "@/components/inventory/InventoryShell";
import { FinancePanel } from "@/components/inventory/FinancePanel";

export default function FinancePage() {
  return (
    <InventoryShell
      title="Финансы"
      subtitle="P&L, юнит-экономика и прибыльность по каналам и товарам"
    >
      <FinancePanel />
    </InventoryShell>
  );
}
