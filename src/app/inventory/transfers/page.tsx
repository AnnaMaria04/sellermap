"use client";

import { InventoryShell } from "@/components/inventory/InventoryShell";
import { TransfersPanel } from "@/components/inventory/TransfersPanel";

export default function TransfersPage() {
  return (
    <InventoryShell
      title="Перемещения"
      subtitle="Управляйте перемещением товаров между локациями"
    >
      <TransfersPanel />
    </InventoryShell>
  );
}
