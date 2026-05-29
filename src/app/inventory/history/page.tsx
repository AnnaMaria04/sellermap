"use client";

import { Suspense } from "react";
import { InventoryShell } from "@/components/inventory/InventoryShell";
import { MovementHistory } from "@/components/inventory/MovementHistory";

export default function HistoryPage() {
  return (
    <InventoryShell
      title="История движений"
      subtitle="Полная история всех операций с товарами"
    >
      <Suspense fallback={<div className="py-16 text-center text-sm text-[var(--c-text3)]">Загрузка...</div>}>
        <MovementHistory />
      </Suspense>
    </InventoryShell>
  );
}
