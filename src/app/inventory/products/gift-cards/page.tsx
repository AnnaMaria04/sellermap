"use client";

import { Gift } from "lucide-react";
import { InventoryShell } from "@/components/inventory/InventoryShell";
import { PageEmptyState } from "@/components/inventory/PageEmptyState";

export default function Page() {
  return (
    <InventoryShell title="Gift cards">
      <PageEmptyState
        icon={<Gift className="h-6 w-6" />}
        title="Gift cards"
        description="Sell gift cards that customers can redeem at checkout."
      />
    </InventoryShell>
  );
}
