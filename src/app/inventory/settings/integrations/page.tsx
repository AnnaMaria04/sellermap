"use client";

import { IntegrationHub } from "@/components/inventory/IntegrationHub";

export default function SettingsIntegrationsPage() {
  return (
    <div className="space-y-1">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-[var(--c-text)]">Интеграции</h1>
        <p className="mt-0.5 text-sm text-[var(--c-text2)]">Подключение маркетплейсов и учётных систем</p>
      </div>
      <IntegrationHub />
    </div>
  );
}
