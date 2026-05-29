"use client";

import { Megaphone } from "lucide-react";
import { InventoryShell } from "@/components/inventory/InventoryShell";
import { PageEmptyState } from "@/components/inventory/PageEmptyState";

export default function Page() {
  return (
    <InventoryShell title="Marketing">
      <PageEmptyState
        icon={<Megaphone className="h-6 w-6" />}
        title="Marketing"
        description="Track and manage your marketing activity in one place."
      />
    </InventoryShell>
  );
}
