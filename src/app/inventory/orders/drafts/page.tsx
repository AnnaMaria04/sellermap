"use client";

import { InventoryShell } from "@/components/inventory/InventoryShell";
import { PageEmptyState } from "@/components/inventory/PageEmptyState";

export default function Page() {
  return (
    <InventoryShell title="Черновики заказов">
      <PageEmptyState
        title="Черновики заказов"
        description="Создавайте черновики, чтобы вручную оформлять заказы по телефону или лично."
        actionLabel="Создать черновик"
        learnMore="Подробнее о заказах"
      />
    </InventoryShell>
  );
}
