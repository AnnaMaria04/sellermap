import type { ProductResult, RiskLevel } from "@/lib/analysis/types";
import type { MarketAggregates } from "@/lib/analysis/marketAggregates";
import { Card } from "@/components/ui/card";
import { formatRub } from "@/lib/utils";
import { riskDot } from "./result-style";

const bubbleClass: Record<RiskLevel, string> = {
  low: "bg-[var(--c-green)]/85",
  medium: "bg-[var(--c-amber)]/85",
  high: "bg-[var(--c-red)]/85",
};

// Static UI metadata for the map. Lives with the component (not with the
// calculator) so the calculator can stay a pure function with no UI strings.
const X_LABEL = "Уровень цены: низкая → высокая";
const Y_LABEL = "Сила отзывов / спроса: низкая → высокая";
const LEGEND = [
  { label: "Окно возможности", className: "bg-[var(--c-green)]" },
  { label: "Плотная зона", className: "bg-[var(--c-amber)]" },
  { label: "Риск позиции", className: "bg-[var(--c-red)]" },
  { label: "Ваш товар", className: "bg-[var(--c-text)]" },
];

const CONCENTRATION_LABEL: Record<NonNullable<MarketAggregates["concentrationLevel"]>, string> = {
  low: "низкая",
  medium: "средняя",
  high: "высокая",
  unknown: "неизвестно",
};

interface Props {
  result: ProductResult;
  /** Aggregates loaded from daily_market_metrics / analysis_competitors.
   *  `undefined` = still loading, `null` = finished but no data. */
  aggregates?: MarketAggregates | null;
  loading?: boolean;
  error?: string | null;
}

export function MarketMap({ result, aggregates, loading, error }: Props) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="section-kicker">Карта рынка</h2>
          <p className="mt-3 text-sm text-[var(--c-text2)]">
            Цена, сила отзывов и оценка продаж по конкурентам.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {LEGEND.map((item) => (
            <span key={item.label} className="inline-flex items-center gap-2 rounded-full bg-[var(--c-bg3)] px-2.5 py-1 text-xs font-semibold text-[var(--c-text2)]">
              <span className={`h-2 w-2 rounded-full ${item.className}`} />
              {item.label}
            </span>
          ))}
        </div>
      </div>

      <MarketStats aggregates={aggregates} loading={loading} error={error} />

      <div className="mt-4 overflow-x-auto">
        <div className="relative h-[390px] min-w-[720px] rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] matrix-grid">
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
              <div className="absolute left-1/2 top-full mt-2 w-44 -translate-x-1/2 rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] p-2 text-xs shadow-sm">
                <p className="font-semibold">{competitor.name}</p>
                <p className="text-[var(--c-text3)]">
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
          <span className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs font-semibold text-[var(--c-text3)]">
            {X_LABEL}
          </span>
          <span className="absolute left-3 top-1/2 -translate-y-1/2 -rotate-90 text-xs font-semibold text-[var(--c-text3)]">
            {Y_LABEL}
          </span>
          <span className="absolute left-4 top-4 rounded-full bg-[var(--c-bg2)] px-2 py-1 text-xs font-semibold text-[var(--c-green)]">
            зона возможностей
          </span>
          <span className="absolute right-4 top-4 rounded-full bg-[var(--c-bg2)] px-2 py-1 text-xs font-semibold text-[var(--c-text)]">
            лидеры выдачи
          </span>
          <span className="absolute bottom-4 right-4 rounded-full bg-[var(--c-bg2)] px-2 py-1 text-xs font-semibold text-[var(--c-red)]">
            риск переплаты
          </span>
        </div>
      </div>
      <div className="mt-4 grid gap-2 text-sm text-[var(--c-text2)] sm:grid-cols-3">
        <LegendDot risk="low" label="Зеленый: окно для входа" />
        <LegendDot risk="medium" label="Янтарный: плотный кластер" />
        <LegendDot risk="high" label="Красный: слабая позиция" />
      </div>
    </Card>
  );
}

function MarketStats({ aggregates, loading, error }: { aggregates?: MarketAggregates | null; loading?: boolean; error?: string | null }) {
  if (loading) {
    return (
      <div className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)]/40 p-3 text-xs text-[var(--c-text3)]">
        Загружаю рыночные показатели…
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-lg border border-[var(--c-red)]/40 bg-[var(--c-red)]/10 p-3 text-xs text-[var(--c-red)]">
        Не удалось загрузить рыночные показатели: {error}
      </div>
    );
  }
  if (!aggregates) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--c-border)] p-3 text-xs text-[var(--c-text3)]">
        По этому запросу пока нет агрегатов рынка. Они появятся после первого сбора через ETL по daily_market_metrics.
      </div>
    );
  }
  const concentration = CONCENTRATION_LABEL[aggregates.concentrationLevel];
  return (
    <div className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)]/40 p-3">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Медианная цена" value={formatRub(aggregates.medianPrice)} hint={`P25–P75: ${formatRub(aggregates.p25Price)} – ${formatRub(aggregates.p75Price)}`} />
        <Stat label="Продавцов" value={String(aggregates.sellerCount)} hint={`Доля топ-3: ${(aggregates.top3SellerShare * 100).toFixed(0)}% · конкуренция ${concentration}`} />
        <Stat label="Отзывы топ-10 (медиана)" value={String(aggregates.top10MedianReviews)} hint={`Медиана по рынку: ${aggregates.medianReviews}`} />
        <Stat label="Размер выборки" value={`${aggregates.sampleSize} карт.`} hint={`Дата: ${aggregates.asOf} · ${aggregates.source}`} />
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-[var(--c-text3)]">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-[var(--c-text)] tabular">{value}</p>
      <p className="text-[11px] text-[var(--c-text3)]">{hint}</p>
    </div>
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
