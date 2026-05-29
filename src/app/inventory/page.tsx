"use client";

import Link from "next/link";
import { Plus, ShoppingCart } from "lucide-react";
import { InventoryShell } from "@/components/inventory/InventoryShell";
import { InventoryOverview } from "@/components/inventory/InventoryOverview";
import { GettingStarted } from "@/components/getting-started/GettingStarted";
import { useInventory } from "@/contexts/InventoryContext";

export default function InventoryPage() {
  const { ready, products, orders } = useInventory();
  // A brand-new/empty workspace lands on the getting-started screen; once there
  // is any catalog or order activity, Home shows the overview.
  const isEmpty = ready && products.length === 0 && orders.length === 0;

  if (isEmpty) {
    return (
      <InventoryShell>
        <GettingStarted />
      </InventoryShell>
    );
  }

  return (
    <InventoryShell
      title="Главная"
      subtitle="Обзор магазина за выбранный период"
      actions={
        <div className="hidden items-center gap-2 sm:flex">
          <Link
            href="/pos"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-1.5 text-sm font-medium text-[var(--c-text)] transition hover:bg-[var(--c-bg)]"
          >
            <ShoppingCart className="h-4 w-4" /> Касса
          </Link>
          <Link
            href="/inventory/products/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--c-green)] px-3 py-1.5 text-sm font-medium text-[var(--c-bg)] transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Добавить товар
          </Link>
        </div>
      }
    >
      <InventoryOverview />
    </InventoryShell>
  );
}
