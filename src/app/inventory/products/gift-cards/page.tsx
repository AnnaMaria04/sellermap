"use client";

import { InventoryShell } from "@/components/inventory/InventoryShell";
import { PageEmptyState } from "@/components/inventory/PageEmptyState";

export default function Page() {
  return (
    <InventoryShell title="Подарочные карты">
      <PageEmptyState
        title="Подарочные карты"
        description="Продавайте подарочные карты, которые клиенты используют при оформлении заказа."
        actionLabel="Создать подарочную карту"
        learnMore="Подробнее о подарочных картах"
      />
    </InventoryShell>
  );
}
