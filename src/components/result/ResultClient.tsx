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
import type { MarginInput, PackagingInput, RawResultInput } from "@/lib/analysis/types";

export function ResultClient({ initialInput }: { initialInput: RawResultInput }) {
  const [input, setInput] = useState(initialInput);
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
