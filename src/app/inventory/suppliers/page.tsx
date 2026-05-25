"use client";

import { InventoryShell } from "@/components/inventory/InventoryShell";
import { SuppliersPanel } from "@/components/inventory/SuppliersPanel";

export default function SuppliersPage() {
  return (
    <InventoryShell
      title="Поставщики"
      subtitle="Управляйте поставщиками, каталогами и условиями"
    >
      <SuppliersPanel />
    </InventoryShell>
  );
}
