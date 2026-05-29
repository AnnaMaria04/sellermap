"use client";

import { InventoryShell } from "@/components/inventory/InventoryShell";
import { PageEmptyState } from "@/components/inventory/PageEmptyState";

export default function Page() {
  return (
    <InventoryShell title="Атрибуция">
      <PageEmptyState
        title="Атрибуция"
        description="Смотрите, какие маркетинговые каналы приносят вам продажи."

        learnMore="Подробнее об атрибуции"
      />
    </InventoryShell>
  );
}
