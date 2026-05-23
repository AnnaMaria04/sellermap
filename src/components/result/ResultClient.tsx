"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [draft] = useState<ProductAnalysisDraft | null>(() => (draftId ? getDraft(draftId) : null));
  const [input, setInput] = useState(() => (draft ? inputFromDraft(initialInput, draft) : initialInput));
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

  useEffect(() => {
    if (draftId && typeof window !== "undefined" && window.location.pathname === "/result") {
      router.replace(`/result/${draftId}`);
    }
  }, [draftId, router]);

  if (draftId && !draft) {
    return <MissingDraftState />;
  }

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

function MissingDraftState() {
  return (
    <div className="rounded-xl border border-[var(--c-amber)]/40 bg-[var(--c-amber-dim)] p-6">
      <p className="section-kicker border-t-0 pt-0 text-[var(--c-amber)]">Отчёт не найден</p>
      <h1 className="font-display mt-3 text-2xl font-semibold text-[var(--c-text)]">
        Черновик анализа не загрузился
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--c-text2)]">
        Этот отчёт сейчас хранится в браузере, где был создан. Если открыть ссылку в другом браузере
        или после очистки localStorage, SellerMap не будет подставлять демо-данные вместо реального анализа.
      </p>
      <a
        href="/check"
        className="mt-5 inline-flex h-11 items-center justify-center rounded-lg bg-[var(--c-green)] px-5 text-sm font-semibold text-[var(--c-bg)] transition hover:bg-[#25e890]"
      >
        Начать новую проверку
      </a>
    </div>
  );
}

function inputFromDraft(initialInput: RawResultInput, draft: ProductAnalysisDraft): RawResultInput {
  const weight = draft.product.weight ?? initialInput.packagingInput.weightKg;
  const dimensions = draft.product.dimensions;
  const sellingPrice = draft.product.plannedSellingPrice ?? initialInput.marginInput.sellingPrice;
  const productCost = draft.product.productCostRub ?? initialInput.marginInput.costPrice;
  const supplierDelivery = draft.product.supplierDeliveryCost ?? 0;
  const packagingCost = draft.product.packagingCost ?? initialInput.marginInput.packagingCost;
  const logistics = draft.product.logisticsCost ?? initialInput.marginInput.wbLogistics;
  const unitsPerMonth = draft.product.selectedQuantity ?? draft.product.moq ?? initialInput.marginInput.unitsPerMonth;

  return {
    ...initialInput,
    title: draft.product.title ?? initialInput.title,
    category: draft.product.category ?? initialInput.category,
    competitors: draft.market?.competitors?.length
      ? draft.market.competitors.slice(0, 8).map((competitor, index) => ({
          name: competitor.title,
          nmId: String(competitor.nmId ?? index),
          imageUrl: competitor.image ?? undefined,
          price: competitor.price ?? 0,
          rating: competitor.rating ?? 0,
          reviews: competitor.reviewCount ?? 0,
          position: index + 1,
          estimatedMonthlySales: competitor.estimatedSales ?? 0,
          estimatedRevenue: competitor.estimatedRevenue ?? 0,
          strength: "Реальные данные WB",
          weakness: competitor.estimatedSales ? "Требует проверки отзывов" : "Продажи недоступны без MPStats",
          positioning: "Публичный WB",
          aiInsight: "Карточка используется как конкурентный ориентир по цене и отзывам.",
          x: Math.min(92, Math.max(8, ((competitor.price ?? sellingPrice) / Math.max(sellingPrice * 1.6, 1)) * 100)),
          y: Math.min(92, Math.max(8, ((competitor.reviewCount ?? 0) / 2000) * 100)),
          bubbleSize: 20 + Math.min(40, Math.log10((competitor.reviewCount ?? 0) + 1) * 12),
          riskLevel: "medium" as const,
        }))
      : initialInput.competitors,
    marginInput: {
      ...initialInput.marginInput,
      sellingPrice,
      costPrice: productCost + supplierDelivery,
      wbCommission: (draft.product.commissionPercent ?? 15) / 100,
      wbLogistics: logistics,
      packagingCost,
      unitsPerMonth,
      returnRate: (draft.product.returnReservePercent ?? 5) / 100,
      taxRate: (draft.product.taxPercent ?? 6) / 100,
      adSpend: Math.round(sellingPrice * ((draft.product.adBudgetPercent ?? 10) / 100) * unitsPerMonth),
    },
    packagingInput: {
      ...initialInput.packagingInput,
      lengthCm: dimensions?.length ?? initialInput.packagingInput.lengthCm,
      widthCm: dimensions?.width ?? initialInput.packagingInput.widthCm,
      heightCm: dimensions?.height ?? initialInput.packagingInput.heightCm,
      weightKg: weight,
      category: draft.product.category ?? initialInput.packagingInput.category,
      quantityPerShipment: unitsPerMonth,
      currency: draft.product.currency === "RUB" ? "RUB" : draft.product.currency === "CNY" ? "CNY" : "USD",
    },
    supplier: {
      ...initialInput.supplier,
      supplierUrl: draft.product.supplierUrl ?? initialInput.supplier.supplierUrl,
      supplierPrice: draft.product.unitCost ?? initialInput.supplier.supplierPrice,
      shippingPrice: supplierDelivery,
      unitWeightKg: weight,
      moq: draft.product.moq ?? initialInput.supplier.moq,
      currency: draft.product.currency === "RUB" ? "RUB" : draft.product.currency === "CNY" ? "CNY" : "USD",
      cartonSize: dimensions ? `${dimensions.length} x ${dimensions.width} x ${dimensions.height} см` : initialInput.supplier.cartonSize,
    },
  };
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

      <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-8">
        <Status label="Спрос" value={draft.market?.marketStats ? "proxy" : "нет данных"} />
        <Status label="Конкуренция" value={draft.market?.marketStats?.marketDifficulty ?? "—"} />
        <Status label="Медиана WB" value={draft.market?.marketStats?.medianPrice ? `${draft.market.marketStats.medianPrice} ₽` : "—"} />
        <Status label="Рекоменд. вход" value={draft.economics ? `${draft.economics.safePriceMin} ₽` : "—"} />
        <Status label="Прибыль / шт." value={draft.economics ? `${draft.economics.profitPerUnit} ₽` : "—"} />
        <Status label="Маржа" value={draft.economics ? `${draft.economics.marginPercent}%` : "—"} />
        <Status label="Барьер отзывов" value={draft.market?.marketStats?.reviewBarrier ? String(draft.market.marketStats.reviewBarrier) : "—"} />
        <Status label="Источник" value={draft.market?.provider ?? "—"} />
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

      {draft.market?.competitors?.length ? (
        <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
          <p className="section-kicker border-t-0 pt-0">Карта конкурентов WB</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {draft.market.competitors.slice(0, 12).map((competitor, index) => (
              <div key={`${competitor.nmId ?? index}`} className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] p-3">
                <div className="flex gap-3">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-[var(--c-bg2)]">
                    {competitor.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={competitor.image} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <p className="max-h-10 overflow-hidden text-sm font-semibold text-[var(--c-text)]">{competitor.title}</p>
                    <p className="mt-1 text-xs text-[var(--c-text2)]">
                      {competitor.price ? `${competitor.price} ₽` : "цена —"} · {competitor.rating ?? "—"}★ · {competitor.reviewCount ?? 0} отзывов
                    </p>
                    <p className="mt-1 text-xs text-[var(--c-text3)]">Позиция {competitor.searchPosition ?? index + 1}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-[var(--c-text3)]">
            Месячные продажи не показываются как факт, если провайдер их не возвращает. SellerMap использует прокси спроса по отзывам, позициям и ценам.
          </p>
        </div>
      ) : null}

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

      <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
        <p className="section-kicker border-t-0 pt-0">Качество данных</p>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <Status label="Поставщик" value={draft.importStatus ?? "manual"} />
          <Status label="WB источник" value={draft.market?.provider ?? "нет"} />
          <Status label="Конкурентов" value={String(draft.market?.competitors?.length ?? 0)} />
          <Status label="Продажи" value="proxy / недоступны как факт" />
        </div>
        <p className="mt-3 text-xs text-[var(--c-text3)]">
          Это не официальные продажи WB. Оценки строятся по доступным marketplace-сигналам и станут точнее после накопления исторических снимков.
        </p>
      </div>
    </div>
  );
}
