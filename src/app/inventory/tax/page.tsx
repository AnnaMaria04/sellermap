"use client";

import { InventoryShell } from "@/components/inventory/InventoryShell";
import { TaxPanel } from "@/components/inventory/TaxPanel";

export default function TaxPage() {
  return (
    <InventoryShell title="Налоги" subtitle="Расчёт налога и взносов · двойной P&L: для налоговой и реальный">
      <TaxPanel />
    </InventoryShell>
  );
}
