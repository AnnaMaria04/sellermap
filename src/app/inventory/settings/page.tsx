"use client";

import { InventoryShell } from "@/components/inventory/InventoryShell";
import { InventorySettings } from "@/components/inventory/InventorySettings";

export default function InventorySettingsPage() {
  return (
    <InventoryShell
      title="Настройки склада"
      subtitle="Конфигурация учётной системы, маркировки и уведомлений"
    >
      <InventorySettings />
    </InventoryShell>
  );
}
