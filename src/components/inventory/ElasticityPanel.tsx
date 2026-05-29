"use client";

import { useMemo } from "react";
import { TrendingUp, Info } from "lucide-react";
import type { Product, StockMovement } from "@/mock/inventory";
import { fitElasticity, priceScenarios, recentSalesAsPoints } from "@/lib/inventory/elasticity";
import { formatRUB, cn } from "@/lib/utils";

interface Props { product: Product; movements: StockMovement[] }

/** Price elasticity card. Until we record per-day price history we can rarely
 *  fit a real model; this panel makes that honest by showing a "накапливаем
 *  данные" state and the latest weekly velocity so the seller still gets a
 *  rough sense before the model warms up. */
export function ElasticityPanel({ product, movements }: Props) {
  const points = useMemo(() => recentSalesAsPoints(product, movements), [product, movements]);
  const model = useMemo(() => fitElasticity(points), [points]);
  const scenarios = useMemo(
    () => (model ? priceScenarios(model, product.price, product.costPrice) : null),
    [model, product.price, product.costPrice],
  );

  const weeklyUnits = points.reduce((s, p) => s + p.weeklyUnits, 0) /
    Math.max(1, points.length);

  return (
    <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-5">
      <div className="mb-3 flex items-center gap-2">
        <TrendingUp size={16} className="text-[var(--c-amber)]" />
        <h3 className="text-sm font-semibold text-[var(--c-text)]">Ценовая аналитика</h3>
      </div>

      {!model && (
        <div className="flex items-start gap-2 rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] p-3 text-xs text-[var(--c-text2)]">
          <Info size={13} className="mt-0.5 shrink-0 text-[var(--c-text3)]" />
          <div>
            Для расчёта эластичности нужно ≥3 разных цены в истории продаж.
            Сейчас в системе одна цена ({formatRUB(product.price)}).
            Запустите акцию или измените цену, и точность вырастет.
            {points.length > 0 && (
              <span> Среднее за неделю: {Math.round(weeklyUnits)} шт.</span>
            )}
          </div>
        </div>
      )}

      {model && scenarios && (
        <>
          <div className="mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
            <span className="text-[var(--c-text3)]">Эластичность спроса:</span>
            <span className="font-semibold tabular text-[var(--c-text)]">
              {model.elasticity.toFixed(2)}
            </span>
            <span className={cn(
              "text-xs",
              Math.abs(model.elasticity) > 1 ? "text-[var(--c-amber)]" : "text-[var(--c-green)]",
            )}>
              {Math.abs(model.elasticity) > 1 ? "эластичный спрос — реагирует на цену" : "неэластичный — цену можно поднять"}
            </span>
            <span className="text-xs text-[var(--c-text3)]">R² {model.rSquared.toFixed(2)}</span>
          </div>
          <div className="overflow-hidden rounded-lg border border-[var(--c-border)]">
            <table className="w-full text-sm">
              <thead className="bg-[var(--c-bg3)] text-left text-xs text-[var(--c-text3)]">
                <tr>
                  <th className="px-3 py-2 font-medium">Сценарий</th>
                  <th className="px-3 py-2 text-right font-medium">Цена</th>
                  <th className="px-3 py-2 text-right font-medium">Прогноз / нед.</th>
                  <th className="px-3 py-2 text-right font-medium">Выручка / нед.</th>
                  <th className="px-3 py-2 text-right font-medium">Прибыль / нед.</th>
                </tr>
              </thead>
              <tbody>
                {scenarios.map((s) => (
                  <tr key={s.label} className={cn(
                    "border-t border-[var(--c-border)]",
                    s.label === "Текущая" && "bg-[var(--c-bg3)]/40",
                  )}>
                    <td className="px-3 py-2 text-[var(--c-text)]">{s.label}</td>
                    <td className="px-3 py-2 text-right tabular text-[var(--c-text)]">{formatRUB(s.price)}</td>
                    <td className="px-3 py-2 text-right tabular text-[var(--c-text2)]">{Math.round(s.units)} шт</td>
                    <td className="px-3 py-2 text-right tabular text-[var(--c-text2)]">{formatRUB(Math.round(s.revenue))}</td>
                    <td className={cn(
                      "px-3 py-2 text-right tabular font-medium",
                      s.profit >= 0 ? "text-[var(--c-green)]" : "text-[var(--c-red)]",
                    )}>{formatRUB(Math.round(s.profit))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-[var(--c-text3)]">
            Модель: лог-лог регрессия по {model.samples} наблюдениям. Точнее данные — точнее прогноз.
          </p>
        </>
      )}
    </div>
  );
}
