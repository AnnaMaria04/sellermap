"use client";

import { InventoryShell } from "@/components/inventory/InventoryShell";
import { LiveView } from "@/components/analytics/LiveView";

export default function LiveViewPage() {
  return (
    <InventoryShell title="В реальном времени">
      <LiveView />
    </InventoryShell>
  );
}
