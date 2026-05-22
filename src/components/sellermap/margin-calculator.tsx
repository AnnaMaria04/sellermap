"use client";

import { useMemo, useState } from "react";
import { Calculator } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { calculateMargin } from "@/lib/calculators";
import { formatRub, marginLabel } from "@/lib/utils";
import { demoMargin } from "@/mock/sellermap";

const fields = [
  ["sellingPrice", "WB selling price"],
  ["productCost", "Product cost"],
  ["commission", "WB commission"],
  ["logisticsCost", "Logistics"],
  ["packagingCost", "Packaging"],
  ["adsReserve", "Ads reserve"],
  ["returnReserve", "Return risk"],
] as const;

export function MarginCalculator() {
  const [values, setValues] = useState(demoMargin);
  const margin = useMemo(() => calculateMargin(values), [values]);
  const label = marginLabel(margin.netMargin);

  return (
    <Card className="p-5">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-soft-green text-primary-green">
          <Calculator size={19} />
        </span>
        <div>
          <h2 className="text-xl font-semibold">Price and margin simulator</h2>
          <p className="text-sm text-neutral-600">Cost stack and safe price range</p>
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
        <div className="grid gap-3 sm:grid-cols-2">
          {fields.map(([key, label]) => (
            <label key={key}>
              <span className="mb-1.5 block text-xs font-semibold text-neutral-600">
                {label}
              </span>
              <Input
                type="number"
                value={Math.round(values[key])}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    [key]: Number(event.target.value),
                  }))
                }
              />
            </label>
          ))}
        </div>
        <div className="rounded-lg border border-light-gray bg-off-white p-4">
          <div className="space-y-2 text-sm">
            {[
              ["Selling price", margin.sellingPrice],
              ["WB commission", -margin.commission],
              ["Logistics", -margin.logisticsCost],
              ["Packaging", -margin.packagingCost],
              ["Ads reserve", -margin.adsReserve],
              ["Product cost", -margin.productCost],
              ["Return reserve", -margin.returnReserve],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3">
                <span className="text-neutral-600">{label}</span>
                <span className="font-mono tabular">{formatRub(Number(value))}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 border-t border-light-gray pt-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-sm text-neutral-600">Estimated profit</p>
                <p className="font-mono text-2xl font-semibold tabular text-dark-green">
                  {formatRub(margin.netProfit)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-neutral-600">Margin</p>
                <p className="font-mono text-2xl font-semibold tabular">
                  {margin.netMargin.toFixed(1)}%
                </p>
              </div>
            </div>
            <div className="mt-4 rounded-lg bg-white p-3 text-sm">
              <div className="flex justify-between">
                <span>Risk label</span>
                <span className="font-semibold text-primary-green">{label}</span>
              </div>
              <div className="mt-2 flex justify-between">
                <span>Break-even</span>
                <span className="font-mono tabular">{formatRub(margin.breakEvenPrice)}</span>
              </div>
              <div className="mt-2 flex justify-between">
                <span>Safe range</span>
                <span className="font-mono tabular">
                  {formatRub(margin.safePriceMin)}-{formatRub(margin.safePriceMax)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
