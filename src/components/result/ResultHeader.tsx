import { Download, FileCheck2, Search } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatRub } from "@/lib/utils";
import type { ProductResult } from "@/lib/analysis/types";
import { ScoreGauge } from "@/components/sellermap/score-gauge";

export function ResultHeader({ result }: { result: ProductResult }) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="grid gap-0 lg:grid-cols-[0.72fr_1.28fr]">
        <div className="bg-charcoal p-6 text-white lg:p-8">
          <p className="text-sm font-semibold text-mint">Итоговое решение</p>
          <div className="mt-6">
            <ScoreGauge score={result.score} />
          </div>
          <div className="mt-6 inline-flex rounded-full bg-mint px-3 py-1 text-sm font-semibold text-dark-green">
            {result.verdictChip}
          </div>
          <p className="mt-4 text-sm leading-6 text-white/72">
            Безопасный диапазон цены:{" "}
            <span className="font-mono text-white">
              {formatRub(result.margin.safePriceMin)}-{formatRub(result.margin.safePriceMax)}
            </span>
          </p>
        </div>
        <div className="p-6 lg:p-8">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-neutral-500">
            <span>nmId {result.nmId}</span>
            <span className="h-1 w-1 rounded-full bg-light-gray" />
            <span>{result.category}</span>
            <span className="h-1 w-1 rounded-full bg-light-gray" />
            <span>обновлено: {result.updatedAt}</span>
          </div>
          <h1 className="mt-4 max-w-4xl text-3xl font-semibold tracking-tight sm:text-5xl">
            {result.title}
          </h1>
          <div className="mt-4 inline-flex rounded-lg border border-light-gray bg-off-white px-3 py-2 text-sm font-semibold text-charcoal">
            {result.verdict}
          </div>
          <p className="mt-4 max-w-3xl text-base leading-7 text-neutral-600">
            {result.summary}
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Metric label="Маржа" value={`${result.margin.marginPercent.toFixed(1)}%`} />
            <Metric label="Прибыль / шт." value={formatRub(result.margin.profit)} />
            <Metric label="Риск упаковки" value={result.packaging.riskLevel === "high" ? "высокий" : result.packaging.riskLevel === "medium" ? "средний" : "низкий"} />
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <LinkButton href="/reports" variant="secondary">
              <FileCheck2 size={16} />
              Сохранить отчет
            </LinkButton>
            <button className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-light-gray bg-white px-5 text-sm font-semibold text-charcoal transition hover:border-primary-green hover:text-primary-green">
              <Download size={16} />
              Экспорт PDF
            </button>
            <LinkButton href="/check">
              <Search size={16} />
              Проверить другой товар
            </LinkButton>
          </div>
        </div>
      </div>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-light-gray bg-off-white p-3">
      <p className="text-xs font-semibold text-neutral-500">{label}</p>
      <p className="mt-1 font-mono text-lg font-semibold tabular">{value}</p>
    </div>
  );
}
