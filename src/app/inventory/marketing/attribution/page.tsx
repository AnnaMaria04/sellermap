"use client";

import { GitBranch } from "lucide-react";
import { InventoryShell } from "@/components/inventory/InventoryShell";
import { PageEmptyState } from "@/components/inventory/PageEmptyState";

export default function Page() {
  return (
    <InventoryShell title="Attribution">
      <PageEmptyState
        icon={<GitBranch className="h-6 w-6" />}
        title="Attribution"
        description="See which marketing channels drive your sales."
      />
    </InventoryShell>
  );
}
