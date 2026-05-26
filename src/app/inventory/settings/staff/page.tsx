"use client";

import { InventoryShell } from "@/components/inventory/InventoryShell";
import { StaffPanel } from "@/components/inventory/StaffPanel";

export default function SettingsStaffPage() {
  return (
    <InventoryShell title="Персонал" subtitle="Сотрудники, роли и приглашения">
      <StaffPanel />
    </InventoryShell>
  );
}
