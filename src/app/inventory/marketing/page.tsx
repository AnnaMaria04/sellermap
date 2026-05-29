"use client";

import { InventoryShell } from "@/components/inventory/InventoryShell";
import { PageEmptyState } from "@/components/inventory/PageEmptyState";

export default function Page() {
  return (
    <InventoryShell title="Маркетинг">
      <PageEmptyState
        title="Маркетинг"
        description="Отслеживайте и управляйте маркетинговой активностью в одном месте."
        actionLabel="Создать кампанию"
        actionHref="/inventory/marketing/campaigns"
        learnMore="Подробнее о маркетинге"
      />
    </InventoryShell>
  );
}
