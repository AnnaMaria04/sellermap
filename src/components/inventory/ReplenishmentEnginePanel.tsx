"use client";

import { useMemo, useState } from "react";
import { Sparkles, AlertTriangle, PackagePlus, Check, TrendingDown } from "lucide-react";
import { useInventory } from "@/contexts/InventoryContext";
import {
  computeReplenishment,
  salesFromMovements,
  salesFromOrders,
  suggestionsToDraftPOs,
  type ReplenishmentSuggestion,
} from "@/lib/replenishment/engine";
import type { PurchaseOrder, PurchaseOrderItem } from "@/mock/inventory";
import { cn, formatRub } from "@/lib/utils";

/**
 * D13: runs the replenishment engine over the active rules and current stock,
 * surfaces what needs reordering, and turns the suggestions into draft purchase
 * orders grouped by supplier — replacing the previous "rules but no engine".
 */
export function ReplenishmentEnginePanel() {
  const { products, replenishmentRules, movements, orders, locations, actions, getSupplierName } =
    useInventory();
  const [created, setCreated] = useState(false);

  const suggestions = useMemo(() => {
    // Prefer movement-derived sales; fall back to order line items.
    const sales = movements.length > 0 ? salesFromMovements(movements) : salesFromOrders(orders);
    return computeReplenishment({ products, rules: replenishmentRules, sales });
  }, [products, replenishmentRules, movements, orders]);

  const drafts = useMemo(() => suggestionsToDraftPOs(suggestions, products), [suggestions, products]);

  const defaultLocation = useMemo(
    () => locations.find((l) => l.isDefault)?.id ?? locations[0]?.id ?? "",
    [locations],
  );

  function createDraftPOs() {
    for (const draft of drafts) {
      const items: PurchaseOrderItem[] = draft.lines.map((l) => ({
        productId: l.productId,
        productName: l.productName,
        sku: l.sku,
        qty: l.qty,
        receivedQty: 0,
        unitCost: l.unitCost,
        totalCost: l.qty * l.unitCost,
      }));
      const po: Omit<PurchaseOrder, "id" | "createdAt" | "updatedAt"> = {
        supplierId: draft.supplierId ?? "",
        supplierName: draft.supplierName ?? getSupplierName(draft.supplierId),
        status: "draft",
        items,
        totalAmount: draft.totalCost,
        currency: "RUB",
        locationId: defaultLocation,
        paymentStatus: "unpaid",
        note: "Сгенерировано движком пополнения",
      };
      actions.addPurchaseOrder(po);
    }
    setCreated(true);
    setTimeout(() => setCreated(false), 4000);
  }

  if (replenishmentRules.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-[var(--c-blue)]" />
          <div>
            <h3 className="text-base font-semibold text-[var(--c-text)]">Движок пополнения</h3>
            <p className="text-xs text-[var(--c-text2)]">
              {suggestions.length > 0
                ? `${suggestions.length} позиц. требуют заказа · ${drafts.length} черновик(ов) поставщикам`
                : "Все запасы в норме по активным правилам"}
            </p>
          </div>
        </div>
        {suggestions.length > 0 && (
          <button
            onClick={createDraftPOs}
            className="flex items-center gap-2 rounded-lg bg-[var(--c-blue)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            {created ? <Check className="h-4 w-4" /> : <PackagePlus className="h-4 w-4" />}
            {created ? "Черновики созданы" : "Создать черновики заказов"}
          </button>
        )}
      </div>

      {suggestions.length === 0 ? (
        <div className="flex items-center gap-2 rounded-lg bg-[var(--c-bg3)] px-4 py-6 text-sm text-[var(--c-text2)]">
          <Check className="h-4 w-4 text-[var(--c-green)]" /> Нет позиций к пополнению.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-[var(--c-text3)]">
                <th className="pb-2 pr-3 font-medium">Товар</th>
                <th className="pb-2 pr-3 font-medium">Остаток</th>
                <th className="pb-2 pr-3 font-medium">Скорость/день</th>
                <th className="pb-2 pr-3 font-medium">Запас, дней</th>
                <th className="pb-2 pr-3 font-medium">Заказать</th>
                <th className="pb-2 font-medium">Причина</th>
              </tr>
            </thead>
            <tbody>
              {suggestions.map((s: ReplenishmentSuggestion) => (
                <tr key={s.ruleId} className="border-t border-[var(--c-border)]">
                  <td className="py-2 pr-3">
                    <div className="font-medium text-[var(--c-text)]">{s.productName}</div>
                    <div className="text-xs text-[var(--c-text3)]">{s.sku}</div>
                  </td>
                  <td className="py-2 pr-3 tabular">{s.available}</td>
                  <td className="py-2 pr-3 tabular">{s.dailyVelocity}</td>
                  <td className="py-2 pr-3">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs",
                        s.daysOfStockRemaining <= 7
                          ? "bg-red-500/10 text-[var(--c-red)]"
                          : "bg-[var(--c-bg3)] text-[var(--c-text2)]",
                      )}
                    >
                      {s.daysOfStockRemaining <= 7 && <AlertTriangle className="h-3 w-3" />}
                      {s.daysOfStockRemaining === Infinity ? "∞" : s.daysOfStockRemaining}
                    </span>
                  </td>
                  <td className="py-2 pr-3 font-semibold tabular text-[var(--c-blue)]">
                    +{s.recommendedQty}
                  </td>
                  <td className="py-2 text-xs text-[var(--c-text2)]">
                    <span className="inline-flex items-center gap-1">
                      <TrendingDown className="h-3 w-3" /> {s.reason}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
