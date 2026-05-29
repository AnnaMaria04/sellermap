"use client";

import { ShoppingCart } from "lucide-react";
import { InventoryShell } from "@/components/inventory/InventoryShell";
import { PageEmptyState } from "@/components/inventory/PageEmptyState";

export default function Page() {
  return (
    <InventoryShell title="Abandoned checkouts">
      <PageEmptyState
        icon={<ShoppingCart className="h-6 w-6" />}
        title="Abandoned checkouts"
        description="Checkouts that were started but never completed appear here."
      />
    </InventoryShell>
  );
}
