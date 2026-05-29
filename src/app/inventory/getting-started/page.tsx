"use client";

import { InventoryShell } from "@/components/inventory/InventoryShell";
import { GettingStarted } from "@/components/getting-started/GettingStarted";

export default function GettingStartedPage() {
  return (
    <InventoryShell>
      <GettingStarted />
    </InventoryShell>
  );
}
