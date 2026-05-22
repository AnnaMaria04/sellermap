import { ChevronDown, Star } from "lucide-react";
import type { ProductResult } from "@/lib/analysis/types";
import { Card } from "@/components/ui/card";
import { formatRub } from "@/lib/utils";
import { riskLabel } from "./result-style";

export function CompetitorCards({ result }: { result: ProductResult }) {
  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Конкурентный срез</h2>
          <p className="text-sm text-neutral-600">
            До 5 ключевых карточек: продажи, позиция, УТП и причина спроса.
          </p>
        </div>
        <button className="inline-flex h-10 items-center gap-2 rounded-lg border border-light-gray bg-white px-4 text-sm font-semibold hover:border-primary-green hover:text-primary-green">
          Показать больше <ChevronDown size={15} />
        </button>
      </div>
      <div className="grid gap-4 xl:grid-cols-5">
        {result.competitors.map((competitor) => (
          <Card key={competitor.nmId} className="p-4 shadow-none">
            <div className="mb-4 aspect-[4/3] rounded-lg border border-light-gray bg-[linear-gradient(135deg,#EAFBF2,#FFFFFF_55%,#E6EAE6)]" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">{competitor.name}</h3>
                <p className="mt-1 text-xs text-neutral-500">nmId {competitor.nmId}</p>
              </div>
              <span className="rounded-full bg-off-white px-2 py-1 text-xs font-semibold">
                #{competitor.position}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <Metric label="Цена" value={formatRub(competitor.price)} />
              <Metric
                label="Рейтинг"
                value={`${competitor.rating} ★`}
                icon={<Star size={12} className="fill-warning text-warning" />}
              />
              <Metric label="Отзывы" value={competitor.reviews.toLocaleString("ru-RU")} />
              <Metric label="Продажи" value={`${competitor.estimatedMonthlySales} шт`} />
              <Metric label="Выручка" value={formatRub(competitor.estimatedRevenue)} wide />
              <Metric label="Риск" value={riskLabel(competitor.riskLevel)} />
            </div>
            <div className="mt-4 space-y-2 text-xs leading-5">
              <p>
                <span className="font-semibold text-primary-green">Сила:</span>{" "}
                {competitor.strength}
              </p>
              <p>
                <span className="font-semibold text-risk">Слабость:</span>{" "}
                {competitor.weakness}
              </p>
              <p>
                <span className="font-semibold">Позиция:</span>{" "}
                {competitor.positioning}
              </p>
              <p className="rounded-lg bg-soft-green p-2 text-dark-green">
                {competitor.aiInsight}
              </p>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  icon,
  wide,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={`rounded-lg bg-off-white p-2 ${wide ? "col-span-2" : ""}`}>
      <p className="text-neutral-500">{label}</p>
      <p className="mt-1 flex items-center gap-1 font-mono font-semibold tabular">
        {icon}
        {value}
      </p>
    </div>
  );
}
