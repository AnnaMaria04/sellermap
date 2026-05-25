"use client";

import { useState } from "react";
import { InventoryShell } from "@/components/inventory/InventoryShell";
import { ProductsTable } from "@/components/inventory/ProductsTable";
import { AddProductForm } from "@/components/inventory/AddProductForm";
import { ImportWizard } from "@/components/inventory/ImportWizard";
import { BarcodeLabelPanel } from "@/components/inventory/BarcodeLabelPanel";

export default function ProductsPage() {
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showLabels, setShowLabels] = useState(false);

  return (
    <InventoryShell
      title="Товары"
      subtitle="Управление каталогом товаров, остатками и ценами"
    >
      <ProductsTable
        onAddProduct={() => setShowAddProduct(true)}
        onImport={() => setShowImport(true)}
      />

      {showAddProduct && (
        <AddProductForm
          onClose={() => setShowAddProduct(false)}
          onSave={(data) => {
            console.log("Saved product:", data);
            setShowAddProduct(false);
          }}
        />
      )}

      {showImport && (
        <ImportWizard onClose={() => setShowImport(false)} />
      )}

      {showLabels && (
        <BarcodeLabelPanel onClose={() => setShowLabels(false)} />
      )}
    </InventoryShell>
  );
}
