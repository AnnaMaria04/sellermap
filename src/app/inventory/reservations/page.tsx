"use client";

import { InventoryShell } from "@/components/inventory/InventoryShell";
import { StockReservationsPanel } from "@/components/inventory/StockReservationsPanel";

export default function ReservationsPage() {
  return (
    <InventoryShell
      title="Резервы"
      subtitle="Управление резервированием товаров под заказы"
    >
      <StockReservationsPanel />
    </InventoryShell>
  );
}
