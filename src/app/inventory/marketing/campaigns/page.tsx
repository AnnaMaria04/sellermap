"use client";

import { InventoryShell } from "@/components/inventory/InventoryShell";
import { PageEmptyState } from "@/components/inventory/PageEmptyState";

export default function Page() {
  return (
    <InventoryShell title="Кампании">
      <PageEmptyState
        title="Кампании"
        description="Создавайте маркетинговые кампании по всем каналам продаж."
        actionLabel="Создать кампанию"
        learnMore="Подробнее о кампаниях"
      />
    </InventoryShell>
  );
}
