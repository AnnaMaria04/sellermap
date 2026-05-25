"use client";

import { InventoryShell } from "@/components/inventory/InventoryShell";
import { MovementHistory } from "@/components/inventory/MovementHistory";

export default function HistoryPage() {
  return (
    <InventoryShell
      title="История движений"
      subtitle="Полная история всех операций с товарами"
    >
      <MovementHistory />
    </InventoryShell>
  );
}
