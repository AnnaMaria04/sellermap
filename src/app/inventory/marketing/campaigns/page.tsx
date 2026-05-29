"use client";

import { Megaphone } from "lucide-react";
import { InventoryShell } from "@/components/inventory/InventoryShell";
import { PageEmptyState } from "@/components/inventory/PageEmptyState";

export default function Page() {
  return (
    <InventoryShell title="Campaigns">
      <PageEmptyState
        icon={<Megaphone className="h-6 w-6" />}
        title="Campaigns"
        description="Create marketing campaigns across your sales channels."
      />
    </InventoryShell>
  );
}
