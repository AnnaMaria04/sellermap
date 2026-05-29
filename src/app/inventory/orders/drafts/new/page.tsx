"use client";

import { InventoryShell } from "@/components/inventory/InventoryShell";
import { DraftOrderEditor } from "@/components/inventory/DraftOrderEditor";

export default function NewDraftOrderPage() {
  return (
    <InventoryShell>
      <DraftOrderEditor />
    </InventoryShell>
  );
}
