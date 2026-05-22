"use client";

import { PackageCheck } from "lucide-react";
import { useMemo, useState } from "react";
import type { PackagingInput, ProductResult } from "@/lib/analysis/types";
import { calculatePackagingRisk } from "@/lib/analysis/calculateResult";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatRub } from "@/lib/utils";
import { riskLabel } from "./result-style";

export function PackagingLogistics({ result }: { result: ProductResult }) {
  const [input, setInput] = useState<PackagingInput>({
    lengthCm: result.packaging.lengthCm,
    widthCm: result.packaging.widthCm,
    heightCm: result.packaging.heightCm,
    weightKg: result.packaging.weightKg,
    fragility: result.packaging.fragility,
    category: result.packaging.category,
    fulfillmentModel: result.packaging.fulfillmentModel,
    packageType: result.packaging.packageType,
    quantityPerShipment: result.packaging.quantityPerShipment,
    supplierCountry: result.packaging.supplierCountry,
    shippingMode: result.packaging.shippingMode,
    currency: result.packaging.currency,
  });
  const packaging = useMemo(() => calculatePackagingRisk(input), [input]);

  return (
    <Card className="p-5">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-soft-green text-primary-green">
          <PackageCheck size={18} />
        </span>
        <div>
          <h2 className="section-kicker">Упаковка и логистика</h2>
          <p className="mt-3 text-sm text-[var(--c-text2)]">
            Расчет связан с габаритами, моделью поставки и каналом поставщика.
          </p>
        </div>
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="grid gap-3 sm:grid-cols-3">
          <NumberField label="Длина, см" value={input.lengthCm} onChange={(v) => setInput({ ...input, lengthCm: v })} />
          <NumberField label="Ширина, см" value={input.widthCm} onChange={(v) => setInput({ ...input, widthCm: v })} />
          <NumberField label="Высота, см" value={input.heightCm} onChange={(v) => setInput({ ...input, heightCm: v })} />
          <NumberField label="Вес, кг" value={input.weightKg} onChange={(v) => setInput({ ...input, weightKg: v })} />
          <NumberField label="Кол-во в поставке" value={input.quantityPerShipment} onChange={(v) => setInput({ ...input, quantityPerShipment: v })} />
          <label>
            <span className="mb-1.5 block text-xs font-semibold text-[var(--c-text2)]">Хрупкость</span>
            <select
              className="h-11 w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] px-3 text-sm text-[var(--c-text)]"
              value={input.fragility}
              onChange={(event) => setInput({ ...input, fragility: event.target.value as PackagingInput["fragility"] })}
            >
              <option>низкая</option>
              <option>средняя</option>
              <option>высокая</option>
            </select>
          </label>
          <label className="sm:col-span-2">
            <span className="mb-1.5 block text-xs font-semibold text-[var(--c-text2)]">Тип упаковки</span>
            <Input value={input.packageType} onChange={(event) => setInput({ ...input, packageType: event.target.value })} />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-semibold text-[var(--c-text2)]">Поставка</span>
            <select
              className="h-11 w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] px-3 text-sm text-[var(--c-text)]"
              value={input.shippingMode}
              onChange={(event) => setInput({ ...input, shippingMode: event.target.value as PackagingInput["shippingMode"] })}
            >
              <option value="air">авиа</option>
              <option value="truck">авто</option>
              <option value="rail">ж/д</option>
              <option value="sea">море</option>
              <option value="manual">ручной расчёт</option>
            </select>
          </label>
        </div>
        <div className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Output label="Упаковка / шт." value={formatRub(packaging.packagingCostPerUnit)} />
            <Output label="Логистика WB" value={formatRub(packaging.wbLogisticsEstimate)} />
            <Output label="Резерв возврата" value={formatRub(packaging.returnCostReserve)} />
            <Output label="Коэффициент доставки" value={String(packaging.deliveryCoefficient)} />
            <Output label="Риск хранения" value={riskLabel(packaging.storageRisk)} />
            <Output label="Риск упаковки" value={riskLabel(packaging.riskLevel)} />
          </div>
          <div className="mt-4 rounded-lg bg-[var(--c-bg2)] p-3">
            <p className="text-xs font-semibold text-[var(--c-text3)]">Влияние на маржу</p>
            <p className="font-display mt-1 text-2xl font-semibold text-[var(--c-red)] tabular">
              -{packaging.marginImpactPoints} п.п.
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--c-text2)]">{packaging.note}</p>
          </div>
        </div>
      </div>
    </Card>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label>
      <span className="mb-1.5 block text-xs font-semibold text-[var(--c-text2)]">{label}</span>
      <Input type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function Output({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[var(--c-bg2)] p-3">
      <p className="text-xs font-semibold text-[var(--c-text3)]">{label}</p>
      <p className="mt-1 font-mono font-semibold tabular">{value}</p>
    </div>
  );
}
