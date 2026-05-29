"use client";

import { Truck } from "lucide-react";
import { InventoryShell } from "@/components/inventory/InventoryShell";
import { PageEmptyState } from "@/components/inventory/PageEmptyState";

export default function Page() {
  return (
    <InventoryShell title="Shipping labels">
      <PageEmptyState
        icon={<Truck className="h-6 w-6" />}
        title="Shipping labels"
        description="Buy and print shipping labels for your orders."
      />
    </InventoryShell>
  );
}
