"use client";

import { InventoryShell } from "@/components/inventory/InventoryShell";
import { InventoryOverview } from "@/components/inventory/InventoryOverview";
import { GettingStarted } from "@/components/getting-started/GettingStarted";
import { useInventory } from "@/contexts/InventoryContext";

export default function InventoryPage() {
  const { ready, products, orders } = useInventory();
  // A brand-new/empty workspace lands on the getting-started screen; once there
  // is any catalog or order activity, Home shows the overview.
  const isEmpty = ready && products.length === 0 && orders.length === 0;

  return (
    <InventoryShell>
      {isEmpty ? <GettingStarted /> : <InventoryOverview />}
    </InventoryShell>
  );
}
