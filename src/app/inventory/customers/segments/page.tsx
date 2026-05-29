"use client";

import { InventoryShell } from "@/components/inventory/InventoryShell";
import { PageEmptyState } from "@/components/inventory/PageEmptyState";

export default function Page() {
  return (
    <InventoryShell title="Сегменты">
      <PageEmptyState
        title="Сегменты"
        description="Создавайте сегменты клиентов для таргетинга по поведению и атрибутам."
        actionLabel="Создать сегмент"
        actionHref="/inventory/customers"
        learnMore="Подробнее о сегментах"
      />
    </InventoryShell>
  );
}
