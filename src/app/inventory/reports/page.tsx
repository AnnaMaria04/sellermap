"use client";

import { InventoryShell } from "@/components/inventory/InventoryShell";
import { InventoryReportsPanel } from "@/components/inventory/InventoryReportsPanel";

export default function ReportsPage() {
  return (
    <InventoryShell
      title="Отчёты"
      subtitle="Формирование и выгрузка аналитических отчётов по складу"
    >
      <InventoryReportsPanel />
    </InventoryShell>
  );
}
