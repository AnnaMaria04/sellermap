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
import { EconomicsWaterfall } from "@/components/EconomicsWaterfall";
import { PriceScenarioSimulator } from "@/components/PriceScenarioSimulator";
import { calculateResult } from "@/lib/analysis/calculateResult";
import { getDraft } from "@/services/draftStorage";
import { calculateDataConfidence } from "@/services/confidenceScoring";
import { analyzeDecision } from "@/services/decisionEngine";
import { generatePriceScenarios } from "@/services/economicsCalculator";
import type { MarginInput, PackagingInput, RawResultInput } from "@/lib/analysis/types";
import type { EconomicsInput, ProductAnalysisDraft } from "@/types/sellermap";

export function ResultClient({ initialInput, draftId }: { initialInput: RawResultInput; draftId?: string }) {
  const [input, setInput] = useState(initialInput);
  const [draft] = useState<ProductAnalysisDraft | null>(() => (draftId ? getDraft(draftId) : null));
  const result = useMemo(() => calculateResult(input), [input]);
  const decisionData = useMemo(() => {
    if (!draft) return null;
    const dataConfidence = calculateDataConfidence(draft);
    const decision = analyzeDecision(draft, dataConfidence);
    const economicsInput: EconomicsInput | null =
      draft.product.plannedSellingPrice &&
      draft.product.productCostRub &&
      draft.product.packagingCost &&
      draft.product.commissionPercent &&
      draft.product.logisticsCost
        ? {
            sellingPrice: draft.product.plannedSellingPrice,
            productCostRub: draft.product.productCostRub,
            currency: "RUB",
            packagingCost: draft.product.packagingCost,
            supplierDeliveryCost: draft.product.supplierDeliveryCost ?? 0,
            commissionPercent: draft.product.commissionPercent,
            wbLogisticsCost: draft.product.logisticsCost,
            storageCost: draft.product.storageCost ?? 20,
            returnReservePercent: draft.product.returnReservePercent ?? 5,
            taxPercent: draft.product.taxPercent ?? 6,
            adBudgetPercent: draft.product.adBudgetPercent ?? 10,
          }
        : null;
    return {
      dataConfidence,
      decision,
      priceScenarios: economicsInput
        ? generatePriceScenarios({
            plannedSellingPrice: economicsInput.sellingPrice,
            marketMedianPrice: draft.market?.marketStats?.medianPrice,
            economicsInput,
          })
        : [],
    };
  }, [draft]);

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
      {draft && decisionData ? (
        <DecisionDashboard draft={draft} decisionData={decisionData} />
      ) : null}
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
              <Status label="Поставщик" value={`${draft.sourcePlatform ?? "manual"} · ${draft.sourceProvider ?? "manual"}`} />
              <Status label="Импорт" value={draft.importStatus ?? "manual"} />
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

function DecisionDashboard({
  draft,
  decisionData,
}: {
  draft: ProductAnalysisDraft;
  decisionData: {
    dataConfidence: ReturnType<typeof calculateDataConfidence>;
    decision: ReturnType<typeof analyzeDecision>;
    priceScenarios: ReturnType<typeof generatePriceScenarios>;
  };
}) {
  const { decision, dataConfidence, priceScenarios } = decisionData;
  return (
    <div className="mb-6 space-y-6">
      <div className="rounded-xl border border-[var(--c-green)]/40 bg-[var(--c-green-dim)] p-6">
        <p className="section-kicker border-t-0 pt-0">Решение по запуску</p>
        <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <h1 className="font-display text-3xl font-semibold text-[var(--c-text)] md:text-5xl">{decision.label}</h1>
            <p className="mt-3 text-sm text-[var(--c-text2)]">{decision.topReasons.join(" · ")}</p>
          </div>
          <div className="font-display text-5xl font-semibold text-[var(--c-green)]">
            {decision.overallScore}<span className="text-2xl text-[var(--c-text3)]">/100</span>
          </div>
        </div>
        <div className="mt-4 inline-flex rounded-full bg-[var(--c-bg3)] px-3 py-1 text-xs text-[var(--c-text2)]">
          Уверенность анализа: {dataConfidence.score}% · {dataConfidence.level}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        <Status label="Прибыль" value={String(decision.scores.profit)} />
        <Status label="Рынок" value={String(decision.scores.market)} />
        <Status label="Конкуренция" value={String(decision.scores.competition)} />
        <Status label="Риск" value={String(decision.scores.risk)} />
        <Status label="Готовность" value={String(decision.scores.launchReadiness)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1fr]">
        <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
          <p className="section-kicker border-t-0 pt-0">Товар поставщика</p>
          <div className="mt-4 flex gap-4">
            <div className="h-24 w-24 overflow-hidden rounded-lg bg-[var(--c-bg3)]">
              {draft.product.images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={draft.product.images[0]} alt="" className="h-full w-full object-cover" />
              ) : null}
            </div>
            <div>
              <p className="font-semibold">{draft.product.title || "Название не найдено"}</p>
              <p className="mt-1 text-sm text-[var(--c-text2)]">{draft.product.supplierName || "Поставщик не найден"}</p>
              <p className="mt-2 text-xs text-[var(--c-amber)]">Изображение поставщика: нужна проверка WB, не загружено на WB.</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
          <p className="section-kicker border-t-0 pt-0">Экономика</p>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <Status label="Прибыль / шт." value={draft.economics ? `${draft.economics.profitPerUnit} ₽` : "—"} />
            <Status label="Маржа" value={draft.economics ? `${draft.economics.marginPercent}%` : "—"} />
            <Status label="Безубыточность" value={draft.economics ? `${draft.economics.breakEvenPrice} ₽` : "—"} />
            <Status label="Мин. безопасная" value={draft.economics ? `${draft.economics.minimumSafePrice} ₽` : "—"} />
          </div>
        </div>
      </div>

      <EconomicsWaterfall economics={draft.economics} sellingPrice={draft.product.plannedSellingPrice} />
      <PriceScenarioSimulator scenarios={priceScenarios} />

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
          <p className="section-kicker border-t-0 pt-0">Недостающие данные</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(dataConfidence.missingCriticalFields.length ? dataConfidence.missingCriticalFields : ["Критичных пропусков нет"]).map((item) => (
              <span key={item} className="rounded-full bg-[var(--c-amber-dim)] px-3 py-1 text-xs text-[var(--c-amber)]">
                {item}
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
          <p className="section-kicker border-t-0 pt-0">План действий</p>
          <div className="mt-3 space-y-2">
            {decision.nextActions.slice(0, 6).map((action) => (
              <div key={action.title} className="rounded-lg bg-[var(--c-bg3)] p-3">
                <p className="font-semibold">{action.title}</p>
                <p className="mt-1 text-xs text-[var(--c-text2)]">{action.action}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
