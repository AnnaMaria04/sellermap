"use client";

import { InventoryShell } from "@/components/inventory/InventoryShell";
import { SyncHealthPanel } from "@/components/inventory/SyncHealthPanel";

export default function SyncHealthPage() {
  return (
    <InventoryShell
      title="Здоровье синхронизации"
      subtitle="Свежесть и статус подключённых каналов продаж"
    >
      <SyncHealthPanel />
    </InventoryShell>
  );
}
