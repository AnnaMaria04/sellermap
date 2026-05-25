"use client";

import { InventoryShell } from "@/components/inventory/InventoryShell";
import { ReturnsPanel } from "@/components/inventory/ReturnsPanel";

export default function ReturnsPage() {
  return (
    <InventoryShell
      title="Возвраты"
      subtitle="Управление возвратами от покупателей и маркетплейсов"
    >
      <ReturnsPanel />
    </InventoryShell>
  );
}
