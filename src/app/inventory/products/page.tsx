"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { InventoryShell } from "@/components/inventory/InventoryShell";
import { ProductsTable } from "@/components/inventory/ProductsTable";
import { AddProductForm } from "@/components/inventory/AddProductForm";
import { ImportWizard } from "@/components/inventory/ImportWizard";
import { BarcodeLabelPanel } from "@/components/inventory/BarcodeLabelPanel";
import { BulkPriceEditor } from "@/components/inventory/BulkPriceEditor";
import { BulkCostEditor } from "@/components/inventory/BulkCostEditor";
import { QuickStockAdjust } from "@/components/inventory/QuickStockAdjust";
import { PriceListsPanel } from "@/components/inventory/PriceListsPanel";
import { ChannelAllocationPanel } from "@/components/inventory/ChannelAllocationPanel";
import { cn } from "@/lib/utils";

type SubTab = "products" | "pricelists" | "allocation";

function ProductsPageInner() {
  const searchParams = useSearchParams();
  const stockParam = searchParams.get("stock") as "low" | "out" | "in" | null;
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  const [showBulkPrice, setShowBulkPrice] = useState(false);
  const [showBulkCost, setShowBulkCost] = useState(false);
  const [showAdjust, setShowAdjust] = useState(false);
  const [subTab, setSubTab] = useState<SubTab>("products");

  return (
    <InventoryShell
      title="Товары"
      subtitle="Управление каталогом товаров, остатками и ценами"
    >
      <div className="mb-5 flex gap-1 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-1 w-fit">
        {[
          { id: "products" as SubTab, label: "Каталог" },
          { id: "pricelists" as SubTab, label: "Прайс-листы" },
          { id: "allocation" as SubTab, label: "Распределение по каналам" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className={cn(
              "rounded-lg px-4 py-1.5 text-sm font-medium transition whitespace-nowrap",
              subTab === t.id
                ? "bg-[var(--c-bg3)] text-[var(--c-text)]"
                : "text-[var(--c-text2)] hover:text-[var(--c-text)]",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subTab === "products" && (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            <button
              onClick={() => setShowBulkCost(true)}
              className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-1.5 text-sm font-medium text-[var(--c-text2)] transition hover:bg-[var(--c-bg3)] hover:text-[var(--c-text)]"
            >
              Себестоимость
            </button>
            <button
              onClick={() => setShowBulkPrice(true)}
              className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-1.5 text-sm font-medium text-[var(--c-text2)] transition hover:bg-[var(--c-bg3)] hover:text-[var(--c-text)]"
            >
              Изменить цены
            </button>
          </div>
          <ProductsTable
            onAddProduct={() => setShowAddProduct(true)}
            onImport={() => setShowImport(true)}
            initialStockFilter={stockParam ?? "all"}
          />
        </>
      )}
      {subTab === "pricelists" && <PriceListsPanel />}
      {subTab === "allocation" && <ChannelAllocationPanel />}

      {showAddProduct && (
        <AddProductForm
          onClose={() => setShowAddProduct(false)}
          onSave={() => setShowAddProduct(false)}
        />
      )}
      {showImport && <ImportWizard onClose={() => setShowImport(false)} />}
      {showLabels && <BarcodeLabelPanel onClose={() => setShowLabels(false)} />}
      {showBulkPrice && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-end bg-black/40"
          onClick={() => setShowBulkPrice(false)}
        >
          <div
            className="h-full w-full max-w-5xl overflow-auto bg-[var(--c-bg)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <BulkPriceEditor onClose={() => setShowBulkPrice(false)} />
          </div>
        </div>
      )}
      {showBulkCost && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-end bg-black/40"
          onClick={() => setShowBulkCost(false)}
        >
          <div
            className="h-full w-full max-w-3xl overflow-hidden bg-[var(--c-bg)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <BulkCostEditor onClose={() => setShowBulkCost(false)} />
          </div>
        </div>
      )}
      {showAdjust && <QuickStockAdjust onClose={() => setShowAdjust(false)} />}
    </InventoryShell>
  );
}

export default function ProductsPage() {
  return (
    <Suspense>
      <ProductsPageInner />
    </Suspense>
  );
}
