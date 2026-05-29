"use client";

import { Layers } from "lucide-react";
import { InventoryShell } from "@/components/inventory/InventoryShell";
import { PageEmptyState } from "@/components/inventory/PageEmptyState";

export default function Page() {
  return (
    <InventoryShell title="Collections">
      <PageEmptyState
        icon={<Layers className="h-6 w-6" />}
        title="Collections"
        description="Group products into collections to make them easier to find and merchandise."
      />
    </InventoryShell>
  );
}
