import type { EconomicsResult } from "@/types/sellermap";
import { formatRub } from "@/lib/utils";

export function EconomicsWaterfall({ economics, sellingPrice }: { economics: EconomicsResult | null; sellingPrice: number | null }) {
  if (!economics || !sellingPrice) return null;
  const rows = [
    ["WB price", sellingPrice, "manual"],
    ["Product cost", -economics.costBreakdown.productCostRub, "apify/manual"],
    ["Supplier delivery", -economics.costBreakdown.supplierDeliveryCost, "manual"],
    ["Packaging", -economics.costBreakdown.packagingCost, "manual"],
    ["WB commission", -economics.costBreakdown.commission, "WB/manual"],
    ["WB logistics", -economics.costBreakdown.wbLogisticsCost, "WB/manual"],
    ["Storage", -economics.costBreakdown.storage, "manual"],
    ["Tax", -economics.costBreakdown.tax, "manual"],
    ["Ad reserve", -economics.costBreakdown.adBudget, "manual"],
    ["Return reserve", -economics.costBreakdown.returnReserve, "manual"],
    ["Profit", economics.profitPerUnit, "SellerMap"],
  ] as const;
  return (
    <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
      <p className="section-kicker border-t-0 pt-0">Разбор затрат</p>
      <div className="mt-4 space-y-2">
        {rows.map(([label, amount, source]) => (
          <div key={label} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-lg bg-[var(--c-bg3)] p-3 text-sm">
            <span>{label}</span>
            <span className={amount >= 0 ? "text-[var(--c-green)]" : "text-[var(--c-red)]"}>{formatRub(amount)}</span>
            <span className="rounded-full bg-[var(--c-bg2)] px-2 py-1 text-[10px] text-[var(--c-text3)]">{source}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
