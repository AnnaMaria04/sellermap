"use client";

import { InventoryShell } from "@/components/inventory/InventoryShell";
import { PageEmptyState } from "@/components/inventory/PageEmptyState";

export default function DraftsPage() {
  return (
    <InventoryShell
      title="Черновики заказов"
      actions={
        <button className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] px-3 py-1.5 text-sm font-medium text-[var(--c-text)] transition hover:bg-[var(--c-bg2)]">
          Действия
        </button>
      }
    >
      <div className="mx-auto max-w-[1040px]">
        <PageEmptyState
          title="Здесь появятся черновики заказов"
          description="Создавайте черновики, чтобы вручную оформлять заказы по телефону или лично, а затем принимать оплату."
          actionLabel="Создать заказ"
          actionHref="/inventory/orders/drafts/new"
          learnMore="Подробнее о черновиках заказов"
        />
      </div>
    </InventoryShell>
  );
}
