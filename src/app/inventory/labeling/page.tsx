"use client";

import { InventoryShell } from "@/components/inventory/InventoryShell";
import { ChestnyZnakPanel } from "@/components/inventory/ChestnyZnakPanel";

export default function LabelingPage() {
  return (
    <InventoryShell
      title="Маркировка «Честный Знак»"
      subtitle="Соответствие требованиям, заказ кодов и ввод в оборот"
    >
      <ChestnyZnakPanel />
    </InventoryShell>
  );
}
