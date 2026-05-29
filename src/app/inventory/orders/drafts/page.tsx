"use client";

import { FileText } from "lucide-react";
import { InventoryShell } from "@/components/inventory/InventoryShell";
import { PageEmptyState } from "@/components/inventory/PageEmptyState";

export default function Page() {
  return (
    <InventoryShell title="Draft orders">
      <PageEmptyState
        icon={<FileText className="h-6 w-6" />}
        title="Draft orders"
        description="Create draft orders to manually take orders over the phone or in person."
      />
    </InventoryShell>
  );
}
