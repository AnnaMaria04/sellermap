"use client";

import { InventoryShell } from "@/components/inventory/InventoryShell";
import { StocktakePanel } from "@/components/inventory/StocktakePanel";

export default function StocktakePage() {
  return (
    <InventoryShell
      title="Инвентаризация"
      subtitle="Пересчёт остатков и корректировка расхождений"
    >
      <StocktakePanel />
    </InventoryShell>
  );
}
