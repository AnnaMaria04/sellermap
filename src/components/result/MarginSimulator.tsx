"use client";

import { Calculator } from "lucide-react";
import { useMemo, useState } from "react";
import { calculateMargin } from "@/lib/analysis/calculateResult";
import type { ProductResult, RawResultInput } from "@/lib/analysis/types";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatRub } from "@/lib/utils";
import { riskDot } from "./result-style";

const fields = [
  ["sellingPrice", "Цена продажи"],
  ["productCost", "Себестоимость"],
  ["supplierShippingPerUnit", "Доставка поставщика / шт."],
  ["packaging", "Упаковка"],
  ["commission", "Комиссия WB"],
  ["logistics", "Логистика WB"],
  ["storageReserve", "Резерв хранения"],
  ["adsReserve", "Реклама"],
  ["returnReserve", "Возвраты"],
  ["taxReserve", "Налог / прочее"],
] as const;

export function MarginSimulator({ result }: { result: ProductResult }) {
  const [input, setInput] = useState<RawResultInput["marginInput"]>({
    sellingPrice: result.margin.sellingPrice,
    productCost: result.margin.productCost,
    supplierShippingPerUnit: result.margin.supplierShippingPerUnit,
    commission: result.margin.commission,
    logistics: result.margin.logistics,
    packaging: result.margin.packaging,
    adsReserve: result.margin.adsReserve,
    returnReserve: result.margin.returnReserve,
    storageReserve: result.margin.storageReserve,
    taxReserve: result.margin.taxReserve,
  });
  const margin = useMemo(() => calculateMargin(input), [input]);
  const visualRisk = margin.marginPercent < 20 ? "high" : margin.marginPercent < 30 ? "medium" : "low";

  return (
    <Card className="p-5">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-soft-green text-primary-green">
          <Calculator size={18} />
        </span>
        <div>
          <h2 className="text-xl font-semibold">Симулятор цены и маржи</h2>
          <p className="text-sm text-neutral-600">
            Текущий риск вверху страницы основан на этой же модели маржи.
          </p>
        </div>
      </div>
      <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
        <div className="grid gap-3 sm:grid-cols-2">
          {fields.map(([key, label]) => (
            <label key={key}>
              <span className="mb-1.5 block text-xs font-semibold text-neutral-600">
                {label}
              </span>
              <Input
                type="number"
                value={Math.round(input[key])}
                onChange={(event) =>
                  setInput((current) => ({
                    ...current,
                    [key]: Number(event.target.value),
                  }))
                }
              />
            </label>
          ))}
        </div>
        <div className="rounded-lg border border-light-gray bg-off-white p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Output label="Прибыль / шт." value={formatRub(margin.profit)} emph />
            <Output label="Чистая маржа" value={`${margin.marginPercent.toFixed(1)}%`} emph />
            <Output label="Точка безубыточности" value={formatRub(margin.breakEvenPrice)} />
            <Output label="Безопасная цена" value={`${formatRub(margin.safePriceMin)}-${formatRub(margin.safePriceMax)}`} />
            <Output label="Макс. реклама" value={formatRub(margin.maxAllowedAdCost)} />
            <Output label="Оценка" value={margin.riskLabel} />
          </div>
          <div className="mt-4 space-y-2">
            {margin.sensitivity.map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-3 rounded-lg bg-white p-3 text-sm">
                <span className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${riskDot(item.risk)}`} />
                  {item.label}
                </span>
                <span className="font-mono font-semibold tabular">
                  {formatRub(item.profitDelta)} / {item.marginDelta.toFixed(1)} п.п.
                </span>
              </div>
            ))}
          </div>
          <div className={`mt-4 rounded-lg p-3 text-sm ${visualRisk === "high" ? "bg-risk/10 text-risk" : "bg-soft-green text-dark-green"}`}>
            {visualRisk === "high"
              ? "Маржа подтверждает верхний риск: нельзя запускать без проверки цены, упаковки и рекламы."
              : "Маржа поддерживает тест, если цена остается в безопасном диапазоне."}
          </div>
        </div>
      </div>
    </Card>
  );
}

function Output({ label, value, emph }: { label: string; value: string; emph?: boolean }) {
  return (
    <div className="rounded-lg bg-white p-3">
      <p className="text-xs font-semibold text-neutral-500">{label}</p>
      <p className={`mt-1 font-mono font-semibold tabular ${emph ? "text-xl text-dark-green" : ""}`}>
        {value}
      </p>
    </div>
  );
}
