import type { ProductResult, RiskLevel } from "@/lib/analysis/types";
import { Card } from "@/components/ui/card";
import { formatRub } from "@/lib/utils";
import { riskDot } from "./result-style";

const bubbleClass: Record<RiskLevel, string> = {
  low: "bg-primary-green/85",
  medium: "bg-warning/85",
  high: "bg-risk/85",
};

export function MarketMap({ result }: { result: ProductResult }) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Карта рынка</h2>
          <p className="text-sm text-neutral-600">
            Цена, сила отзывов и оценка продаж по конкурентам.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {result.marketMap.legend.map((item) => (
            <span key={item.label} className="inline-flex items-center gap-2 rounded-full bg-off-white px-2.5 py-1 text-xs font-semibold text-charcoal">
              <span className={`h-2 w-2 rounded-full ${item.className}`} />
              {item.label}
            </span>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <div className="relative h-[390px] min-w-[720px] rounded-lg border border-light-gray bg-off-white matrix-grid">
          {result.competitors.map((competitor) => (
            <div
              key={competitor.nmId}
              className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full ${bubbleClass[competitor.riskLevel]} shadow-sm`}
              style={{
                left: `${competitor.x}%`,
                bottom: `${competitor.y}%`,
                width: competitor.bubbleSize,
                height: competitor.bubbleSize,
              }}
              title={competitor.name}
            >
              <div className="absolute left-1/2 top-full mt-2 w-44 -translate-x-1/2 rounded-lg border border-light-gray bg-white p-2 text-xs shadow-sm">
                <p className="font-semibold">{competitor.name}</p>
                <p className="text-neutral-500">
                  {formatRub(competitor.price)} · {competitor.rating} ★ · {competitor.reviews}
                </p>
                <p className="mt-1 font-mono text-primary-green tabular">
                  {competitor.estimatedMonthlySales} шт/мес
                </p>
              </div>
            </div>
          ))}
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-green p-2 shadow-[0_0_0_10px_rgba(11,15,14,0.18)] ring-2 ring-charcoal"
            style={{ left: "58%", bottom: "62%" }}
          >
            <div className="h-4 w-4 rounded-full bg-mint" />
          </div>
          <span className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs font-semibold text-neutral-500">
            {result.marketMap.xLabel}
          </span>
          <span className="absolute left-3 top-1/2 -translate-y-1/2 -rotate-90 text-xs font-semibold text-neutral-500">
            {result.marketMap.yLabel}
          </span>
          <span className="absolute left-4 top-4 rounded-full bg-white px-2 py-1 text-xs font-semibold text-primary-green">
            зона возможности
          </span>
          <span className="absolute right-4 top-4 rounded-full bg-white px-2 py-1 text-xs font-semibold text-charcoal">
            лидеры выдачи
          </span>
          <span className="absolute bottom-4 right-4 rounded-full bg-white px-2 py-1 text-xs font-semibold text-risk">
            риск переплаты
          </span>
        </div>
      </div>
      <div className="mt-4 grid gap-2 text-sm text-neutral-600 sm:grid-cols-3">
        <LegendDot risk="low" label="Зеленый: окно для входа" />
        <LegendDot risk="medium" label="Янтарный: плотный кластер" />
        <LegendDot risk="high" label="Красный: слабая позиция" />
      </div>
    </Card>
  );
}

function LegendDot({ risk, label }: { risk: RiskLevel; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`h-2.5 w-2.5 rounded-full ${riskDot(risk)}`} />
      {label}
    </span>
  );
}
