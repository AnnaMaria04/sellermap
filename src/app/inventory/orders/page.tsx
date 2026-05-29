"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { InventoryShell } from "@/components/inventory/InventoryShell";
import { OrdersPanel } from "@/components/inventory/OrdersPanel";
import { OrdersAnalyticsBar } from "@/components/analytics/OrdersAnalyticsBar";
import { PageEmptyState } from "@/components/inventory/PageEmptyState";
import { useInventory } from "@/contexts/InventoryContext";
import { cn } from "@/lib/utils";

function MoreActions({ showBar, onToggleBar }: { showBar: boolean; onToggleBar: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-1.5 rounded-lg border bg-[var(--c-bg)] px-3 py-1.5 text-sm font-medium text-[var(--c-text)] transition",
          open ? "border-[var(--c-blue)] ring-1 ring-[var(--c-blue)]" : "border-[var(--c-border)] hover:bg-[var(--c-bg2)]",
        )}
      >
        Действия
        <ChevronDown className={cn("h-3.5 w-3.5 text-[var(--c-text3)] transition", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg)] p-1 shadow-xl">
          <button
            onClick={() => { onToggleBar(); setOpen(false); }}
            className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm text-[var(--c-text)] hover:bg-[var(--c-bg3)]"
          >
            Показать аналитику
            {showBar && <Check className="h-4 w-4 text-[var(--c-green)]" />}
          </button>
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  const [showBar, setShowBar] = useState(false);
  const { ready, orders } = useInventory();
  const isEmpty = ready && orders.length === 0;

  return (
    <InventoryShell
      title="Заказы"
      subtitle="Заказы со всех каналов продаж, сборка и отгрузка"
      actions={<MoreActions showBar={showBar} onToggleBar={() => setShowBar((v) => !v)} />}
    >
      {showBar && <OrdersAnalyticsBar />}
      {isEmpty ? (
        <div className="mx-auto max-w-[1040px]">
          <PageEmptyState
            title="Здесь появятся ваши заказы"
            description="Здесь вы будете выполнять заказы, принимать оплату и отслеживать их статусы."
            actionLabel="Создать заказ"
            actionHref="/inventory/orders/drafts/new"
            learnMore="Подробнее о заказах"
          />
        </div>
      ) : (
        <OrdersPanel />
      )}
    </InventoryShell>
  );
}
