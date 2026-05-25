"use client";
import { InventoryShell } from "@/components/inventory/InventoryShell";
import { CustomersPanel } from "@/components/inventory/CustomersPanel";
export default function CustomersPage() {
  return (
    <InventoryShell title="Клиенты" subtitle="База клиентов, история заказов и программа лояльности">
      <CustomersPanel />
    </InventoryShell>
  );
}
