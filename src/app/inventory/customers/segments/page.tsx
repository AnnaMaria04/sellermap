"use client";

import { Filter } from "lucide-react";
import { InventoryShell } from "@/components/inventory/InventoryShell";
import { PageEmptyState } from "@/components/inventory/PageEmptyState";

export default function Page() {
  return (
    <InventoryShell title="Segments">
      <PageEmptyState
        icon={<Filter className="h-6 w-6" />}
        title="Segments"
        description="Build customer segments to target groups by behavior and attributes."
      />
    </InventoryShell>
  );
}
