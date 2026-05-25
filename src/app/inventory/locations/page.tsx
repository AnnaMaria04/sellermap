"use client";

import { InventoryShell } from "@/components/inventory/InventoryShell";
import { LocationsManager } from "@/components/inventory/LocationsManager";

export default function LocationsPage() {
  return (
    <InventoryShell
      title="Склады и локации"
      subtitle="Управление складскими помещениями, магазинами и точками хранения"
    >
      <LocationsManager />
    </InventoryShell>
  );
}
