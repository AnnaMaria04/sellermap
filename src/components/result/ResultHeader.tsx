import { FileCheck2, Search } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatRub } from "@/lib/utils";
import type { ProductResult } from "@/lib/analysis/types";
import { riskLabel } from "./result-style";

export function ResultHeader({ result }: { result: ProductResult }) {
  const scoreColor =
    result.score >= 70
      ? "text-[var(--c-green)]"
      : result.score >= 50
        ? "text-[var(--c-amber)]"
        : "text-[var(--c-red)]";

  return (
    <Card className="border-l-[3px] border-l-[var(--c-green)] bg-[var(--c-green-dim)] p-6 lg:p-8">
      <div className="grid gap-8 lg:grid-cols-[0.45fr_1fr] lg:items-start">
        <div>
          <p className="section-kicker border-t-0 pt-0">Итоговое решение</p>
          <div className={`font-display mt-5 text-5xl font-semibold tabular sm:text-[72px] ${scoreColor}`}>
            {result.score}<span className="text-2xl text-[var(--c-text3)] sm:text-3xl">/100</span>
          </div>
          <div className="mt-5 inline-flex rounded-lg bg-[var(--c-bg3)] px-3 py-2 text-sm font-medium text-[var(--c-green)]">
            {result.verdictChip}
          </div>
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[var(--c-text3)]">
            <span>nmId {result.nmId}</span>
            <span className="h-1 w-1 rounded-full bg-[var(--c-border2)]" />
            <span>{result.category}</span>
            <span className="h-1 w-1 rounded-full bg-[var(--c-border2)]" />
            <span>обновлено: {result.updatedAt}</span>
          </div>
          <h1 className="font-display mt-4 max-w-4xl text-3xl font-semibold tracking-tight sm:text-5xl">
            {result.title}
          </h1>
          <div className="font-display mt-4 text-base font-semibold">
            {result.verdict}
          </div>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-[var(--c-text2)]">
            {result.summary}
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Metric label="Маржа" value={`${result.margin.marginPercent.toFixed(1)}%`} tone="warning" />
            <Metric label="Прибыль / шт" value={formatRub(result.margin.profit)} tone="positive" />
            <Metric
              label="Риск упаковки"
              value={riskLabel(result.packaging.riskLevel)}
              tone={result.packaging.riskLevel === "low" ? "positive" : result.packaging.riskLevel === "medium" ? "warning" : "negative"}
            />
          </div>
          <p className="mt-3 text-sm text-[var(--c-text2)]">
            Безопасная цена:{" "}
            <span className="font-semibold text-[var(--c-text)]">
              {formatRub(result.margin.safePriceMin)}–{formatRub(result.margin.safePriceMax)}
            </span>
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <LinkButton href="/reports" variant="secondary">
              <FileCheck2 size={16} />
              Сохранить отчёт
            </LinkButton>
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

function Metric({ label, value, tone }: { label: string; value: string; tone: "positive" | "warning" | "negative" }) {
  const toneClass =
    tone === "positive"
      ? "text-[var(--c-green)]"
      : tone === "warning"
        ? "text-[var(--c-amber)]"
        : "text-[var(--c-red)]";

  return (
    <div className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] p-3">
      <p className="text-[11px] font-medium text-[var(--c-text3)]">{label}</p>
      <p className={`font-display mt-1 text-xl font-semibold tabular ${toneClass}`}>{value}</p>
    </div>
  );
}
