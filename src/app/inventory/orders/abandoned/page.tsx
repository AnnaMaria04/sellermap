"use client";

import { InventoryShell } from "@/components/inventory/InventoryShell";
import { PageEmptyState } from "@/components/inventory/PageEmptyState";

export default function Page() {
  return (
    <InventoryShell title="Брошенные корзины">
      <PageEmptyState
        title="Брошенные корзины"
        description="Здесь появятся оформления, которые начали, но не завершили."

        learnMore="Подробнее о брошенных корзинах"
      />
    </InventoryShell>
  );
}
