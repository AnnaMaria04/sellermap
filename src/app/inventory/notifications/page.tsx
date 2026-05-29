"use client";

import { InventoryShell } from "@/components/inventory/InventoryShell";
import { NotificationsCenter } from "@/components/inventory/NotificationsCenter";

export default function NotificationsPage() {
  return (
    <InventoryShell
      title="Уведомления"
      subtitle="Оповещения о критических событиях склада"
    >
      <NotificationsCenter />
    </InventoryShell>
  );
}
