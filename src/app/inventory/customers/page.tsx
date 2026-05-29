"use client";
import { InventoryShell } from "@/components/inventory/InventoryShell";
import { CustomersPanel } from "@/components/inventory/CustomersPanel";
import { CustomersEmptyState } from "@/components/inventory/CustomersEmptyState";
import { useInventory } from "@/contexts/InventoryContext";

export default function CustomersPage() {
  const { ready, customers } = useInventory();
  const isEmpty = ready && customers.length === 0;
  return (
    <InventoryShell title="Клиенты" subtitle="База клиентов, история заказов и программа лояльности">
      {isEmpty ? <CustomersEmptyState /> : <CustomersPanel />}
    </InventoryShell>
  );
}
