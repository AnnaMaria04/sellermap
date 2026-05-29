"use client";

import { InventoryShell } from "@/components/inventory/InventoryShell";
import { PageEmptyState } from "@/components/inventory/PageEmptyState";

export default function Page() {
  return (
    <InventoryShell title="Этикетки доставки">
      <PageEmptyState
        title="Этикетки доставки"
        description="Покупайте и печатайте этикетки доставки прямо из заказов."
        actionLabel="Купить этикетку"
        learnMore="Подробнее о доставке"
      />
    </InventoryShell>
  );
}
