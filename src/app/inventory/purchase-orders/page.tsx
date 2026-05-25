"use client";

import { useState } from "react";
import { InventoryShell } from "@/components/inventory/InventoryShell";
import { PurchaseOrderList } from "@/components/inventory/PurchaseOrderList";
import { PurchaseOrderForm } from "@/components/inventory/PurchaseOrderForm";

export default function PurchaseOrdersPage() {
  const [showForm, setShowForm] = useState(false);

  return (
    <InventoryShell
      title="Заказы поставщикам"
      subtitle="Создавайте и отслеживайте заказы на пополнение товаров"
    >
      <PurchaseOrderList onCreatePO={() => setShowForm(true)} />

      {showForm && (
        <PurchaseOrderForm
          onClose={() => setShowForm(false)}
          onSave={() => setShowForm(false)}
        />
      )}
    </InventoryShell>
  );
}
