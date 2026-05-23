import type { PriceScenario } from "@/types/sellermap";
import { formatRub } from "@/lib/utils";

export function PriceScenarioSimulator({ scenarios }: { scenarios: PriceScenario[] }) {
  if (!scenarios.length) return null;
  return (
    <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
      <p className="section-kicker border-t-0 pt-0">Сценарии цены</p>
      <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-5">
        {scenarios.map((scenario) => (
          <div key={scenario.price} className="rounded-lg bg-[var(--c-bg3)] p-3">
            <p className="font-display text-xl font-semibold text-[var(--c-text)]">{formatRub(scenario.price)}</p>
            <p className="mt-2 text-sm text-[var(--c-green)]">Маржа: {scenario.marginPercent}%</p>
            <p className="text-xs text-[var(--c-text3)]">{scenario.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
