"use client";
import { InventoryShell } from "@/components/inventory/InventoryShell";
import { PromotionsPanel } from "@/components/inventory/PromotionsPanel";

export default function PromotionsPage() {
  return (
    <InventoryShell
      title="Акции и скидки"
      subtitle="Управляйте промоакциями, скидками и промокодами"
    >
      <PromotionsPanel />
    </InventoryShell>
  );
}
