"use client";

import { InventoryShell } from "@/components/inventory/InventoryShell";
import { BundleProductsPanel } from "@/components/inventory/BundleProductsPanel";

export default function BundlesPage() {
  return (
    <InventoryShell
      title="Комплекты и наборы"
      subtitle="Создание и управление комплектными товарами"
    >
      <BundleProductsPanel />
    </InventoryShell>
  );
}
