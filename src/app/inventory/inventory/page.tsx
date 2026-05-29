"use client";

import { useMemo, useState } from "react";
import { Search, Boxes } from "lucide-react";
import { InventoryShell } from "@/components/inventory/InventoryShell";
import { PageEmptyState } from "@/components/inventory/PageEmptyState";
import { useInventory } from "@/contexts/InventoryContext";
import { cn } from "@/lib/utils";

export default function InventoryLevelsPage() {
  const { products, getAvailableStock, getLocationName } = useInventory();
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    return products
      .filter((p) => !query || p.name.toLowerCase().includes(query) || p.sku.toLowerCase().includes(query))
      .map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        available: getAvailableStock(p),
        committed: p.reservedUnits,
        onHand: p.totalPhysical,
        byLocation: p.stockByLocation,
      }));
  }, [products, q, getAvailableStock]);

  return (
    <InventoryShell title="Inventory" subtitle="Stock on hand, committed and available to sell">
      {products.length === 0 ? (
        <PageEmptyState
          icon={<Boxes className="h-6 w-6" />}
          title="No inventory yet"
          description="Add products to start tracking stock levels across your locations."
        />
      ) : (
        <>
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-2">
            <Search className="h-4 w-4 text-[var(--c-text3)]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search products"
              className="w-full bg-transparent text-sm text-[var(--c-text)] outline-none placeholder:text-[var(--c-text3)]"
            />
          </div>
          <div className="overflow-x-auto rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--c-border)] text-left text-xs uppercase text-[var(--c-text3)]">
                  <th className="px-4 py-2.5 font-medium">Product</th>
                  <th className="px-4 py-2.5 font-medium">SKU</th>
                  <th className="px-4 py-2.5 text-right font-medium">On hand</th>
                  <th className="px-4 py-2.5 text-right font-medium">Committed</th>
                  <th className="px-4 py-2.5 text-right font-medium">Available</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-[var(--c-border)] last:border-0">
                    <td className="px-4 py-3 font-medium text-[var(--c-text)]">
                      {r.name}
                      <div className="text-xs font-normal text-[var(--c-text3)]">
                        {Object.entries(r.byLocation)
                          .map(([loc, qty]) => `${getLocationName(loc)}: ${qty}`)
                          .join(" · ")}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[var(--c-text2)]">{r.sku || "—"}</td>
                    <td className="px-4 py-3 text-right tabular text-[var(--c-text)]">{r.onHand}</td>
                    <td className="px-4 py-3 text-right tabular text-[var(--c-text2)]">{r.committed}</td>
                    <td className={cn("px-4 py-3 text-right tabular font-medium", r.available <= 0 ? "text-[var(--c-red)]" : "text-[var(--c-text)]")}>
                      {r.available}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </InventoryShell>
  );
}
