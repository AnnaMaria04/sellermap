"use client";

import { InventoryShell } from "@/components/inventory/InventoryShell";
import { PageEmptyState } from "@/components/inventory/PageEmptyState";

export default function Page() {
  return (
    <InventoryShell title="Коллекции">
      <PageEmptyState
        title="Коллекции"
        description="Группируйте товары в коллекции, чтобы их было проще находить и продвигать."
        actionLabel="Создать коллекцию"
        actionHref="/inventory/products"
        learnMore="Подробнее о коллекциях"
      />
    </InventoryShell>
  );
}
