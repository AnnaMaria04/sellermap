"use client";

import { AlertTriangle } from "lucide-react";
import { Calculator } from "lucide-react";
import { useMemo, useState } from "react";
import { calculateMargin, validateMarginResult } from "@/lib/analysis/calculateResult";
import type { MarginInput, ProductResult } from "@/lib/analysis/types";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatRub } from "@/lib/utils";
import { riskDot } from "./result-style";

// Fields where the stored value is a decimal (0.19) but displayed as percent (19)
const PCT_FIELDS = new Set<keyof MarginInput>(["wbCommission", "returnRate"]);

const numericFields: Array<{ key: keyof MarginInput; label: string }> = [
  { key: "sellingPrice", label: "Цена продажи" },
  { key: "costPrice", label: "Себестоимость (landed cost)" },
  { key: "wbCommission", label: "Комиссия WB, %" },
  { key: "wbLogistics", label: "Логистика WB ₽/шт" },
  { key: "packagingCost", label: "Упаковка ₽/шт" },
  { key: "adSpend", label: "Реклама ₽/мес" },
  { key: "storagePerMonth", label: "Хранение ₽/мес" },
  { key: "returnRate", label: "Возвраты, %" },
  { key: "unitsPerMonth", label: "Продажи план, шт/мес" },
];

function displayVal(key: keyof MarginInput, value: number): string {
  return PCT_FIELDS.has(key) ? String(Math.round(value * 100)) : String(Math.round(value));
}

function parseVal(key: keyof MarginInput, raw: string): number {
  const n = Number(raw);
  return PCT_FIELDS.has(key) ? n / 100 : n;
}

function fmtMoney(v: number) {
  return isFinite(v) ? formatRub(v) : "—";
}

function fmtPriceRange(min: number, max: number) {
  if (!isFinite(min)) return "— (комиссия + налог ≥ 100%)";
  return `${formatRub(min)}–${formatRub(max)}`;
}

export function MarginSimulator({ result }: { result: ProductResult }) {
  const [input, setInput] = useState<MarginInput>({
    sellingPrice: result.margin.sellingPrice,
    costPrice: result.margin.costPrice,
    wbCommission: result.margin.wbCommission,
    wbLogistics: result.margin.wbLogistics,
    packagingCost: result.margin.packagingCost,
    adSpend: result.margin.adSpend,
    storagePerMonth: result.margin.storagePerMonth,
    returnRate: result.margin.returnRate,
    unitsPerMonth: result.margin.unitsPerMonth,
    taxRate: result.margin.taxRate,
  });

  const margin = useMemo(() => calculateMargin(input), [input]);
  const warnings = useMemo(() => validateMarginResult(margin), [margin]);
  const visualRisk =
    margin.marginPercent < 20 ? "high" : margin.marginPercent < 30 ? "medium" : "low";

  function handleChange(key: keyof MarginInput, raw: string) {
    setInput((prev: MarginInput) => ({ ...prev, [key]: parseVal(key, raw) }));
  }

  function handleTaxChange(raw: string) {
    setInput((prev: MarginInput) => ({ ...prev, taxRate: Number(raw) }));
  }

  return (
    <Card className="p-5">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-soft-green text-primary-green">
          <Calculator size={18} />
        </span>
        <div>
          <h2 className="section-kicker">Симулятор цены и маржи</h2>
          <p className="mt-3 text-sm text-[var(--c-text2)]">
            Текущий риск вверху страницы основан на этой же модели маржи.
          </p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
        {/* Inputs */}
        <div className="grid gap-3 sm:grid-cols-2">
          {numericFields.map(({ key, label }) => (
            <label key={key}>
              <span className="mb-1.5 block text-xs font-semibold text-neutral-600">{label}</span>
              <Input
                type="number"
                value={displayVal(key, input[key] as number)}
                onChange={(e) => handleChange(key, e.target.value)}
              />
            </label>
          ))}
          <label>
            <span className="mb-1.5 block text-xs font-semibold text-neutral-600">
              Ставка налога
            </span>
            <select
              value={String(input.taxRate)}
              onChange={(e) => handleTaxChange(e.target.value)}
              className="h-10 w-full rounded-md border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 text-sm text-[var(--c-text)] focus:outline-none focus:ring-1 focus:ring-[var(--c-green)]"
            >
              <option value="0.06">6% — УСН доходы</option>
              <option value="0.15">15% — УСН доходы-расходы</option>
            </select>
          </label>
        </div>

        {/* Outputs */}
        <div className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Output label="Прибыль / шт." value={fmtMoney(margin.profitPerUnit)} emph />
            <Output label="Чистая маржа" value={`${margin.marginPercent.toFixed(1)}%`} emph />
            <Output label="Прибыль / мес." value={fmtMoney(margin.monthlyProfit)} />
            <Output label="Ед. к продаже" value={`${Math.round(margin.effectiveUnits)} шт.`} />
            <Output label="Точка безубыточности" value={fmtMoney(margin.breakEvenPrice)} />
            <Output
              label="Безопасная цена"
              value={fmtPriceRange(margin.safePriceMin, margin.safePriceMax)}
            />
            <Output label="Макс. бюджет рекламы" value={`${fmtMoney(margin.maxAdSpend)}/мес`} />
            <Output label="Оценка" value={margin.riskLabel} />
          </div>

          <div className="mt-4 space-y-2">
            {margin.sensitivity.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between gap-3 rounded-lg bg-[var(--c-bg2)] p-3 text-sm"
              >
                <span className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${riskDot(item.risk)}`} />
                  {item.label}
                </span>
                <span className="font-mono font-semibold tabular">
                  {fmtMoney(item.profitDelta)} / {item.marginDelta.toFixed(1)} п.п.
                </span>
              </div>
            ))}
          </div>

          {warnings.length > 0 && (
            <div className="mt-4 space-y-1.5 rounded-lg border border-[var(--c-amber)]/40 bg-[var(--c-amber-dim)] p-3">
              {warnings.map((w) => (
                <p key={w} className="flex items-start gap-2 text-sm text-[var(--c-amber)]">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                  {w}
                </p>
              ))}
            </div>
          )}

          <div
            className={`mt-4 rounded-lg p-3 text-sm ${
              visualRisk === "high"
                ? "bg-risk/10 text-risk"
                : "bg-soft-green text-dark-green"
            }`}
          >
            {visualRisk === "high"
              ? "Маржа подтверждает верхний риск: нельзя запускать без проверки цены, упаковки и рекламы."
              : "Маржа поддерживает тест, если цена остается в безопасном диапазоне."}
          </div>
        </div>
      </div>
    </Card>
  );
}

function Output({
  label,
  value,
  emph,
}: {
  label: string;
  value: string;
  emph?: boolean;
}) {
  return (
    <div className="rounded-lg bg-[var(--c-bg2)] p-3">
      <p className="text-xs font-semibold text-[var(--c-text3)]">{label}</p>
      <p
        className={`font-display mt-1 font-semibold tabular ${
          emph ? "text-xl text-[var(--c-green)]" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}
