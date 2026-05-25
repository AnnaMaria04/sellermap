"use client";

import { InventoryShell } from "@/components/inventory/InventoryShell";
import { OrdersPanel } from "@/components/inventory/OrdersPanel";

export default function OrdersPage() {
  return (
    <InventoryShell
      title="Заказы"
      subtitle="Заказы со всех каналов продаж, сборка и отгрузка"
    >
      <OrdersPanel />
    </InventoryShell>
  );
}
