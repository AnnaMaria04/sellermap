"use client";

import { InventoryShell } from "@/components/inventory/InventoryShell";
import { InventoryOverview } from "@/components/inventory/InventoryOverview";

export default function InventoryPage() {
  return (
    <InventoryShell>
      <InventoryOverview />
    </InventoryShell>
  );
}
