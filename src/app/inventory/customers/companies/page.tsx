"use client";

import { InventoryShell } from "@/components/inventory/InventoryShell";
import { PageEmptyState } from "@/components/inventory/PageEmptyState";

export default function Page() {
  return (
    <InventoryShell title="Компании">
      <PageEmptyState
        title="Компании"
        description="Управляйте B2B-компаниями и их адресами."
        actionLabel="Добавить компанию"
        learnMore="Подробнее о компаниях"
      />
    </InventoryShell>
  );
}
