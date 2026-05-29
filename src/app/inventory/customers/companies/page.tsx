"use client";

import { Building2 } from "lucide-react";
import { InventoryShell } from "@/components/inventory/InventoryShell";
import { PageEmptyState } from "@/components/inventory/PageEmptyState";

export default function Page() {
  return (
    <InventoryShell title="Companies">
      <PageEmptyState
        icon={<Building2 className="h-6 w-6" />}
        title="Companies"
        description="Manage B2B companies and their locations."
      />
    </InventoryShell>
  );
}
