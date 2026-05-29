"use client";
import { InventoryShell } from "@/components/inventory/InventoryShell";
import { StaffPanel } from "@/components/inventory/StaffPanel";
export default function StaffPage() {
  return (
    <InventoryShell title="Персонал" subtitle="Управление сотрудниками и правами доступа">
      <StaffPanel />
    </InventoryShell>
  );
}
