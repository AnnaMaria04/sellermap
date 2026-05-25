"use client";

import { InventoryShell } from "@/components/inventory/InventoryShell";
import { IntegrationHub } from "@/components/inventory/IntegrationHub";

export default function IntegrationsPage() {
  return (
    <InventoryShell
      title="Интеграции"
      subtitle="Подключение маркетплейсов и учётных систем"
    >
      <IntegrationHub />
    </InventoryShell>
  );
}
