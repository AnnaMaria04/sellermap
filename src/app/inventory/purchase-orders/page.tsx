"use client";

import { useState } from "react";
import { InventoryShell } from "@/components/inventory/InventoryShell";
import { PurchaseOrderList } from "@/components/inventory/PurchaseOrderList";
import { PurchaseOrderForm } from "@/components/inventory/PurchaseOrderForm";
import { PODashboard } from "@/components/inventory/PODashboard";
import { cn } from "@/lib/utils";

type Tab = "list" | "dashboard";

export default function PurchaseOrdersPage() {
  const [tab, setTab] = useState<Tab>("list");
  const [showForm, setShowForm] = useState(false);

  return (
    <InventoryShell
      title="Заказы поставщикам"
      subtitle="Создавайте и отслеживайте заказы на пополнение товаров"
    >
      <div className="mb-5 flex gap-1 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-1 w-fit">
        {(
          [
            ["list", "Все заказы"],
            ["dashboard", "Дашборд поставок"],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition",
              tab === id
                ? "bg-[var(--c-bg3)] text-[var(--c-text)]"
                : "text-[var(--c-text2)] hover:text-[var(--c-text)]",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "list" && (
        <>
          <PurchaseOrderList onCreatePO={() => setShowForm(true)} />
          {showForm && (
            <PurchaseOrderForm
              onClose={() => setShowForm(false)}
              onSave={() => {
                setShowForm(false);
              }}
            />
          )}
        </>
      )}
      {tab === "dashboard" && <PODashboard />}
    </InventoryShell>
  );
}
