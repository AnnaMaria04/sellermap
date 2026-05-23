"use client";

import { useCallback, useMemo, useState } from "react";
import { ActionChecklist } from "@/components/result/ActionChecklist";
import { AiInsights } from "@/components/result/AiInsights";
import { CardAudit } from "@/components/result/CardAudit";
import { CompetitorCards } from "@/components/result/CompetitorCards";
import { DataSourcesPanel } from "@/components/result/DataSourcesPanel";
import { MarginSimulator } from "@/components/result/MarginSimulator";
import { MarketMap } from "@/components/result/MarketMap";
import { PackagingLogistics } from "@/components/result/PackagingLogistics";
import { ResultHeader } from "@/components/result/ResultHeader";
import { ScoreBreakdown } from "@/components/result/ScoreBreakdown";
import { SupplierPanel } from "@/components/result/SupplierPanel";
import { calculateResult } from "@/lib/analysis/calculateResult";
import { getDraft } from "@/services/draftStorage";
import type { MarginInput, PackagingInput, RawResultInput } from "@/lib/analysis/types";
import type { ProductAnalysisDraft } from "@/types/sellermap";

export function ResultClient({ initialInput, draftId }: { initialInput: RawResultInput; draftId?: string }) {
  const [input, setInput] = useState(initialInput);
  const [draft] = useState<ProductAnalysisDraft | null>(() => (draftId ? getDraft(draftId) : null));
  const result = useMemo(() => calculateResult(input), [input]);

  const updateMargin = useCallback((marginInput: MarginInput) => {
    setInput((current) => ({ ...current, marginInput }));
  }, []);

  const updatePackaging = useCallback((packagingInput: PackagingInput) => {
    setInput((current) => ({
      ...current,
      packagingInput,
    }));
  }, []);

  return (
    <>
      <ResultHeader result={result} />

      <div className="mt-8 flex justify-center">
        <a
          href="#analysis"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--c-text3)] transition hover:text-[var(--c-text2)]"
        >
          ↓ Подробный анализ
        </a>
      </div>

      <div id="analysis" className="mt-6 scroll-mt-4 space-y-6">
        {draft && (
          <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
            <p className="section-kicker border-t-0 pt-0">Источники и качество данных</p>
            <div className="mt-3 grid gap-3 md:grid-cols-4">
              <Status label="Поставщик" value={`${draft.sourcePlatform} · ${draft.sourceProvider}`} />
              <Status label="Импорт" value={draft.importStatus} />
              <Status label="WB API" value={draft.wbConnection ? "проверен" : "не подключён"} />
              <Status label="Рынок" value={draft.market?.status === "success" ? "данные есть" : "Рыночные данные не подключены. Подключите MPStats или включите демо-режим."} />
            </div>
            {draft.warnings.length > 0 && (
              <p className="mt-3 text-sm text-[var(--c-amber)]">{draft.warnings.join(" ")}</p>
            )}
          </div>
        )}
        <ScoreBreakdown result={result} />
        <MarginSimulator result={result} onInputChange={updateMargin} />
        <MarketMap result={result} />
        <CompetitorCards result={result} />

        <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
          <AiInsights result={result} />
          <ActionChecklist result={result} />
        </div>

        <CardAudit result={result} />
        <PackagingLogistics result={result} onInputChange={updatePackaging} />
        <SupplierPanel result={result} />
        <DataSourcesPanel result={result} />
      </div>
    </>
  );
}

function Status({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[var(--c-bg3)] p-3">
      <p className="text-xs text-[var(--c-text3)]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--c-text)]">{value}</p>
    </div>
  );
}
