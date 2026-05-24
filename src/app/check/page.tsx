"use client";

import { ArrowRight, BarChart3, Calculator, CheckCircle2, ChevronDown, Loader2, Package2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { getWBCommission } from "@/lib/wbCommissions";
import { calcWBLogistics } from "@/lib/wbLogistics";
import { formatRub } from "@/lib/utils";
import { parseWbUrl } from "@/lib/parseWbUrl";
import { PageSection } from "@/components/sellermap/section";

// ─── types ────────────────────────────────────────────────────────────────────

type Step = { label: string; state: "pending" | "active" | "done" };

type WbProduct = { kind: "wb"; nmId: string; name: string; brand: string; category: string; price: number; rating: number; reviews: number };
type SupplierProduct = { kind: "supplier"; domain: string };
type KeywordEntry = { kind: "keyword" };
type SupplierCard = WbProduct | SupplierProduct | KeywordEntry;

type WbMarket = {
  query: string;
  total: number;
  medianPrice: number;
  entryBarrier: number;
  demandLevel: "высокий" | "средний" | "низкий";
  competitors: Array<{ nmId: string; name: string; brand: string; price: number; rating: number; reviews: number; position: number; imageUrl: string }>;
};

type AnalyzeResponse = {
  supplierProduct?: {
    productTitle?: string;
    platform?: string;
    supplierName?: string | null;
    supplierPriceMin?: number | null;
    currency?: string | null;
    moq?: number | null;
    grossWeightKg?: number | null;
    packageSize?: { lengthCm?: number | null; widthCm?: number | null; heightCm?: number | null } | null;
  };
  fingerprint?: {
    ruKeywords?: string[];
    categoryGuess?: string;
  };
  marketAnalysis?: {
    competitors?: Array<{
      nmId: string;
      title: string;
      brand?: string | null;
      priceRub: number | null;
      rating?: number | null;
      reviewCount?: number | null;
      imageUrl?: string | null;
      searchPosition?: number | null;
    }>;
    priceStats?: { median?: number | null };
    reviewStats?: { top10Median?: number | null };
    demand?: { demandLevel?: "low" | "medium" | "high" | "unknown" };
  };
  economics?: {
    targetPriceRub?: number;
    supplierUnitCost?: number;
    marginPercent?: number;
    profitPerUnitRub?: number;
  };
  decision?: {
    verdictLabel?: string;
    opportunityScore?: number;
  };
  debug?: {
    marketAnalysisId?: string | null;
    providersUsed?: string[];
    warnings?: string[];
  };
  error?: string;
};

type Phase =
  | { name: "idle" }
  | { name: "loading"; steps: Step[] }
  | { name: "needs-keyword"; supplierDomain: string }
  | { name: "done"; supplier: SupplierCard | null; market: WbMarket | null; analysisId?: string | null; source?: string; warnings?: string[]; decision?: string; score?: number }
  | { name: "error"; message: string };

// ─── helpers ──────────────────────────────────────────────────────────────────

function detectInputType(value: string): "wb-url" | "wb-nmid" | "alibaba" | "aliexpress" | "1688" | "keyword" {
  const v = value.trim();
  if (/wildberries\.ru|wb\.ru/i.test(v)) return "wb-url";
  if (/^[\d]{6,12}$/.test(v)) return "wb-nmid";
  if (/alibaba\.com/i.test(v)) return "alibaba";
  if (/aliexpress/i.test(v)) return "aliexpress";
  if (/1688\.com/i.test(v)) return "1688";
  return "keyword";
}

function isSupplierUrl(t: ReturnType<typeof detectInputType>) {
  return t === "alibaba" || t === "aliexpress" || t === "1688";
}

function extractDomain(url: string) {
  try { return new URL(url).hostname.replace("www.", ""); } catch { return url; }
}

function shortKeyword(name: string): string {
  return name.split(/\s+/).slice(0, 4).join(" ");
}

function calcPreview(sellingPrice: number, costPrice: number, category: string) {
  const commission = getWBCommission(category);
  const logistics = calcWBLogistics(30, 20, 8, 0.5);
  const packaging = 80;
  const commissionRub = Math.round(sellingPrice * commission);
  const totalCost = costPrice + logistics + packaging + commissionRub;
  const profit = sellingPrice - totalCost;
  const margin = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0;
  return { commission, commissionRub, logistics, packaging, profit, margin };
}

function demandLabel(value?: "low" | "medium" | "high" | "unknown") {
  if (value === "high") return "высокий";
  if (value === "medium") return "средний";
  return "низкий";
}

function analysisToMarket(analysis: AnalyzeResponse, fallbackQuery: string): WbMarket | null {
  const competitors = analysis.marketAnalysis?.competitors ?? [];
  if (!competitors.length) return null;
  return {
    query: analysis.fingerprint?.ruKeywords?.[0] ?? fallbackQuery,
    total: competitors.length,
    medianPrice: Math.round(analysis.marketAnalysis?.priceStats?.median ?? analysis.economics?.targetPriceRub ?? 0),
    entryBarrier: Math.round(analysis.marketAnalysis?.reviewStats?.top10Median ?? 0),
    demandLevel: demandLabel(analysis.marketAnalysis?.demand?.demandLevel),
    competitors: competitors.slice(0, 5).map((item, index) => ({
      nmId: item.nmId,
      name: item.title,
      brand: item.brand ?? "",
      price: item.priceRub ?? 0,
      rating: item.rating ?? 0,
      reviews: item.reviewCount ?? 0,
      position: item.searchPosition ?? index + 1,
      imageUrl: item.imageUrl ?? "",
    })),
  };
}

function analysisToSupplier(analysis: AnalyzeResponse): SupplierCard | null {
  const supplier = analysis.supplierProduct;
  if (!supplier?.productTitle) return { kind: "keyword" };
  return {
    kind: "wb",
    nmId: analysis.debug?.marketAnalysisId ?? "analysis",
    name: supplier.productTitle,
    brand: supplier.supplierName ?? supplier.platform ?? "",
    category: analysis.fingerprint?.categoryGuess ?? "",
    price: analysis.economics?.targetPriceRub ?? analysis.marketAnalysis?.priceStats?.median ?? 0,
    rating: 0,
    reviews: supplier.moq ?? 0,
  } satisfies WbProduct;
}

function resultHref(phase: Phase) {
  if (phase.name === "done" && phase.analysisId) return `/result/${phase.analysisId}`;
  return "/result";
}

// ─── main component ───────────────────────────────────────────────────────────

export default function CheckPage() {
  const [inputValue, setInputValue] = useState("");
  const [phase, setPhase] = useState<Phase>({ name: "idle" });
  const [kwInput, setKwInput] = useState("");
  const [costInput, setCostInput] = useState("0");
  const [costCategory, setCostCategory] = useState("");
  const [showDetail, setShowDetail] = useState(false);

  async function runWbSearch(keyword: string): Promise<WbMarket | null> {
    try {
      const res = await fetch(`/api/check/wb-search?q=${encodeURIComponent(keyword)}`);
      if (!res.ok) return null;
      return res.json() as Promise<WbMarket>;
    } catch { return null; }
  }

  async function runAnalysis(input: {
    supplierUrl?: string;
    manualTitle?: string;
    platform?: "manual";
    targetPriceRub?: number;
    costRub?: number;
  }) {
    const body = input.supplierUrl
      ? {
          supplierUrl: input.supplierUrl,
          userCostAssumptions: {
            targetPriceRub: input.targetPriceRub,
            supplierUnitCost: input.costRub,
          },
        }
      : {
          manualSupplierData: {
            supplierUrl: `manual://${encodeURIComponent(input.manualTitle ?? "keyword")}`,
            platform: input.platform ?? "manual",
            productTitle: input.manualTitle ?? "Товар",
            currency: "RUB",
          },
          userCostAssumptions: {
            targetPriceRub: input.targetPriceRub,
            supplierUnitCost: input.costRub,
          },
        };

    const res = await fetch("/api/check/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as AnalyzeResponse;
    if (!res.ok || data.error) throw new Error(data.error ?? "Не удалось создать анализ.");
    return data;
  }

  function makeSteps(labels: string[]): Step[] {
    return labels.map((label, i) => ({ label, state: i === 0 ? "active" : "pending" }));
  }

  function advance(steps: Step[], index: number): Step[] {
    return steps.map((s, i) => ({
      ...s,
      state: i < index ? "done" : i === index ? "active" : "pending",
    }));
  }

  async function handleSubmit(raw: string) {
    const value = raw.trim();
    if (!value) return;
    const type = detectInputType(value);

    if (isSupplierUrl(type)) {
      let steps = makeSteps([
        "Извлекаем товар поставщика",
        "Создаём fingerprint и ключи WB",
        "Собираем похожие товары WB",
        "Считаем экономику и сохраняем отчёт",
      ]);
      setPhase({ name: "loading", steps });
      try {
        steps = advance(steps, 1);
        setPhase({ name: "loading", steps });
        const analysis = await runAnalysis({ supplierUrl: value });
        steps = advance(steps, 3);
        setPhase({ name: "loading", steps });
        await new Promise((r) => setTimeout(r, 300));
        const market = analysisToMarket(analysis, value);
        const supplier = analysisToSupplier(analysis) ?? { kind: "supplier", domain: extractDomain(value) };
        setCostInput(String(Math.round(analysis.economics?.supplierUnitCost ?? 0)));
        setCostCategory(analysis.fingerprint?.categoryGuess ?? "");
        setPhase({
          name: "done",
          supplier,
          market,
          analysisId: analysis.debug?.marketAnalysisId,
          source: analysis.debug?.providersUsed?.join(" → ") ?? "provider ladder",
          warnings: analysis.debug?.warnings,
          decision: analysis.decision?.verdictLabel,
          score: analysis.decision?.opportunityScore,
        });
      } catch (error) {
        setPhase({
          name: "error",
          message: error instanceof Error ? error.message : "Не удалось импортировать поставщика. Можно проверить по ключевому запросу или ввести вручную.",
        });
      }
      return;
    }

    if (type === "wb-url" || type === "wb-nmid") {
      let steps = makeSteps(["Определяем тип запроса", "Загружаем карточку с Wildberries", "Ищем похожие товары", "Рассчитываем экономику"]);
      setPhase({ name: "loading", steps });

      const nmId = parseWbUrl(value) ?? value.trim();
      steps = advance(steps, 1);
      setPhase({ name: "loading", steps });

      let supplier: SupplierCard | null = null;
      let wbKeyword = "";
      try {
        const res = await fetch(`/api/wb-product?nm=${nmId}`);
        const data = await res.json() as { error?: string; nmId?: number; name?: string; brand?: string; category?: string; price?: number; rating?: number; reviewCount?: number };
        if (!data.error && data.name) {
          supplier = { kind: "wb", nmId: String(data.nmId), name: data.name, brand: data.brand ?? "", category: data.category ?? "", price: data.price ?? 0, rating: data.rating ?? 0, reviews: data.reviewCount ?? 0 };
          wbKeyword = shortKeyword(data.name);
          setCostCategory(data.category ?? "");
        }
      } catch { /* ignore */ }

      steps = advance(steps, 2);
      setPhase({ name: "loading", steps });
      const analysis = await runAnalysis({
        manualTitle: wbKeyword || value,
        platform: "manual",
        targetPriceRub: supplier?.kind === "wb" ? supplier.price : undefined,
      });
      const market = analysisToMarket(analysis, wbKeyword || value) ?? await runWbSearch(wbKeyword || value);

      steps = advance(steps, 3);
      setPhase({ name: "loading", steps });
      await new Promise((r) => setTimeout(r, 300));

      setPhase({
        name: "done",
        supplier: supplier ?? analysisToSupplier(analysis),
        market,
        analysisId: analysis.debug?.marketAnalysisId,
        source: analysis.debug?.providersUsed?.join(" → ") ?? "provider ladder",
        warnings: analysis.debug?.warnings,
        decision: analysis.decision?.verdictLabel,
        score: analysis.decision?.opportunityScore,
      });
      return;
    }

    // Russian keyword
    let steps = makeSteps(["Создаём анализ", "Ищем товары на Wildberries", "Сохраняем отчёт"]);
    setPhase({ name: "loading", steps });
    const analysis = await runAnalysis({ manualTitle: value, platform: "manual" });
    const market = analysisToMarket(analysis, value) ?? await runWbSearch(value);
    steps = advance(steps, 1);
    setPhase({ name: "loading", steps });
    await new Promise((r) => setTimeout(r, 300));
    setPhase({
      name: "done",
      supplier: analysisToSupplier(analysis) ?? { kind: "keyword" },
      market,
      analysisId: analysis.debug?.marketAnalysisId,
      source: analysis.debug?.providersUsed?.join(" → ") ?? "provider ladder",
      warnings: analysis.debug?.warnings,
      decision: analysis.decision?.verdictLabel,
      score: analysis.decision?.opportunityScore,
    });
  }

  async function handleKeywordSubmit() {
    const kw = kwInput.trim();
    if (!kw) return;
    const domain = phase.name === "needs-keyword" ? phase.supplierDomain : "";
    let steps = makeSteps(["Поставщик определён", "Ищем похожие товары на Wildberries", "Рассчитываем экономику"]);
    steps[0] = { ...steps[0], state: "done" };
    steps[1] = { ...steps[1], state: "active" };
    setPhase({ name: "loading", steps });
    const analysis = await runAnalysis({ manualTitle: kw, platform: "manual" });
    const market = analysisToMarket(analysis, kw) ?? await runWbSearch(kw);
    steps = advance(steps, 2);
    setPhase({ name: "loading", steps });
    await new Promise((r) => setTimeout(r, 300));
    setPhase({
      name: "done",
      supplier: { kind: "supplier", domain } as SupplierProduct,
      market,
      analysisId: analysis.debug?.marketAnalysisId,
      source: analysis.debug?.providersUsed?.join(" → ") ?? "provider ladder",
      warnings: analysis.debug?.warnings,
      decision: analysis.decision?.verdictLabel,
      score: analysis.decision?.opportunityScore,
    });
  }

  function reset() {
    setPhase({ name: "idle" });
    setInputValue("");
    setKwInput("");
    setCostInput("0");
    setCostCategory("");
    setShowDetail(false);
  }

  return (
    <main className="min-h-screen bg-[var(--c-bg)]">
      <PageSection className="py-16">

        {phase.name === "idle" && (
          <div className="mx-auto max-w-xl">
            <Link href="/" className="mx-auto mb-8 flex w-fit items-center gap-2 text-[var(--c-text)]">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--c-green)] shadow-[0_0_28px_rgba(31,209,131,0.22)]">
                <svg width="18" height="16" viewBox="0 0 13 11" fill="none" aria-hidden="true">
                  <path d="M1 10L6.5 1L12 10H1Z" fill="currentColor" className="text-[var(--c-bg)]" />
                </svg>
              </span>
              <span className="font-display text-lg font-bold tracking-tight">SellerMap</span>
            </Link>
            <h1 className="font-display text-center text-4xl font-semibold tracking-tight text-[var(--c-text)] sm:text-5xl">
              Стоит ли брать товар?
            </h1>
            <p className="mt-4 text-center text-sm leading-6 text-[var(--c-text2)]">
              Вставьте ссылку на товар поставщика или Wildberries
            </p>
            <form
              className="mt-8 flex gap-2"
              onSubmit={(e) => { e.preventDefault(); void handleSubmit(inputValue); }}
            >
              <input
                autoFocus
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Alibaba, AliExpress, Wildberries или запрос на русском"
                className="h-12 flex-1 rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-4 text-sm text-[var(--c-text)] placeholder-[var(--c-text3)] outline-none transition focus:border-[var(--c-green)] focus:ring-1 focus:ring-[var(--c-green)]"
              />
              <button
                type="submit"
                disabled={!inputValue.trim()}
                className="inline-flex h-12 items-center gap-2 rounded-lg bg-[var(--c-green)] px-5 text-sm font-semibold text-[var(--c-bg)] transition hover:bg-[#25e890] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Проверить <ArrowRight size={16} />
              </button>
            </form>
            <p className="mt-4 text-center text-xs text-[var(--c-text3)]">
              Принимает: ссылки WB · Alibaba · AliExpress · 1688 · поисковый запрос на русском
            </p>
          </div>
        )}

        {phase.name === "needs-keyword" && (
          <div className="mx-auto max-w-xl space-y-4">
            <InfoCard icon={<Package2 size={18} />} label="Поставщик">
              <p className="font-semibold text-[var(--c-text)]">{phase.supplierDomain}</p>
              <p className="mt-1 text-xs text-[var(--c-text3)]">Apify не подключён · введите ключевые слова для поиска WB</p>
              <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); void handleKeywordSubmit(); }}>
                <input
                  autoFocus
                  value={kwInput}
                  onChange={(e) => setKwInput(e.target.value)}
                  placeholder="маркер краска posca"
                  className="h-10 flex-1 rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] px-3 text-sm text-[var(--c-text)] placeholder-[var(--c-text3)] outline-none focus:border-[var(--c-green)]"
                />
                <button type="submit" disabled={!kwInput.trim()} className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-[var(--c-green)] px-4 text-sm font-semibold text-[var(--c-bg)] disabled:opacity-50">
                  Искать <ArrowRight size={14} />
                </button>
              </form>
            </InfoCard>
            <button onClick={reset} className="text-xs text-[var(--c-text3)] hover:text-[var(--c-text2)]">← Начать заново</button>
          </div>
        )}

        {phase.name === "loading" && (
          <div className="mx-auto max-w-sm space-y-3">
            {phase.steps.map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                {step.state === "done" && <CheckCircle2 size={18} className="shrink-0 text-[var(--c-green)]" />}
                {step.state === "active" && <Loader2 size={18} className="shrink-0 animate-spin text-[var(--c-green)]" />}
                {step.state === "pending" && <span className="h-[18px] w-[18px] shrink-0 rounded-full border border-[var(--c-border2)]" />}
                <span className={`text-sm ${step.state === "pending" ? "text-[var(--c-text3)]" : step.state === "active" ? "text-[var(--c-text)]" : "text-[var(--c-text2)]"}`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        )}

        {phase.name === "done" && (
          <div className="mx-auto max-w-2xl space-y-4">

            {phase.supplier?.kind === "wb" && (
              <InfoCard icon={<Package2 size={18} />} label="Карточка WB">
                <p className="font-semibold text-[var(--c-text)]">{phase.supplier.name}</p>
                <p className="mt-1 text-sm text-[var(--c-text2)]">{phase.supplier.brand} · {phase.supplier.category}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Chip label="Цена" value={formatRub(phase.supplier.price)} />
                  <Chip label="Рейтинг" value={`${phase.supplier.rating} ★`} />
                  <Chip label="Отзывы" value={phase.supplier.reviews.toLocaleString("ru-RU")} />
                </div>
              </InfoCard>
            )}

            {phase.supplier?.kind === "supplier" && (
              <InfoCard icon={<Package2 size={18} />} label="Поставщик">
                <p className="font-semibold text-[var(--c-text)]">{(phase.supplier as SupplierProduct).domain}</p>
                <p className="mt-1 text-xs text-[var(--c-text3)]">Apify не подключён · данные поставщика недоступны</p>
              </InfoCard>
            )}

            {phase.market && (
              <InfoCard icon={<BarChart3 size={18} />} label="Рынок Wildberries">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs text-[var(--c-text3)]">«{phase.market.query}»</p>
                  {phase.source && <span className="rounded-full bg-[var(--c-green-dim)] px-2 py-0.5 text-[10px] font-semibold text-[var(--c-green)]">{phase.source}</span>}
                  {phase.score !== undefined && <span className="rounded-full bg-[var(--c-bg3)] px-2 py-0.5 text-[10px] font-semibold text-[var(--c-text2)]">score {Math.round(phase.score)}/100</span>}
                </div>
                {phase.decision && <p className="mt-2 text-sm font-semibold text-[var(--c-text)]">{phase.decision}</p>}
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <MetricBlock label="Продавцов" value={phase.market.total.toLocaleString("ru-RU")} />
                  <MetricBlock label="Медиана цены" value={formatRub(phase.market.medianPrice)} accent />
                  <MetricBlock label="Спрос" value={phase.market.demandLevel} />
                  <MetricBlock label="Барьер входа" value={`${phase.market.entryBarrier} отз.`} />
                </div>
                {phase.market.competitors.length > 0 && (
                  <div className="mt-4">
                    <button onClick={() => setShowDetail((v) => !v)} className="flex items-center gap-1.5 text-xs text-[var(--c-text3)] hover:text-[var(--c-text2)]">
                      Топ-5 конкурентов <ChevronDown size={13} className={showDetail ? "rotate-180 transition-transform" : "transition-transform"} />
                    </button>
                    {showDetail && (
                      <div className="mt-3 space-y-1.5">
                        {phase.market.competitors.map((c) => (
                          <div key={c.nmId} className="flex items-center gap-3 rounded-lg bg-[var(--c-bg3)] px-3 py-2 text-sm">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={c.imageUrl} alt="" className="h-10 w-8 shrink-0 rounded object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                            <span className="min-w-0 flex-1 truncate font-medium text-[var(--c-text)]">#{c.position} {c.name}</span>
                            <span className="shrink-0 font-mono text-xs tabular">{formatRub(c.price)}</span>
                            <span className="shrink-0 text-xs text-[var(--c-text3)]">{c.reviews.toLocaleString("ru-RU")} отз.</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {phase.warnings?.length ? (
                  <div className="mt-4 rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--c-text3)]">Качество данных</p>
                    <ul className="mt-2 space-y-1 text-xs leading-5 text-[var(--c-text2)]">
                      {phase.warnings.slice(0, 3).map((warning) => <li key={warning}>• {warning}</li>)}
                    </ul>
                  </div>
                ) : null}
              </InfoCard>
            )}

            {phase.market && phase.market.medianPrice > 0 && (
              <EconomicsCard
                sellingPrice={phase.market.medianPrice}
                costInput={costInput}
                onCostChange={setCostInput}
                category={costCategory}
              />
            )}

            <div className="flex items-center justify-between gap-4 pt-2">
              <button onClick={reset} className="text-sm text-[var(--c-text3)] hover:text-[var(--c-text2)]">
                ← Проверить другой товар
              </button>
              <Link href={resultHref(phase)} className="inline-flex h-11 items-center gap-2 rounded-lg bg-[var(--c-green)] px-6 text-sm font-semibold text-[var(--c-bg)] transition hover:bg-[#25e890]">
                {phase.analysisId ? "Открыть сохранённый отчёт →" : "Открыть черновик отчёта →"}
              </Link>
            </div>
          </div>
        )}

        {phase.name === "error" && (
          <div className="mx-auto max-w-md rounded-xl bg-[var(--c-red-dim)] p-5 text-sm text-[var(--c-red)]">
            {phase.message}
            <button onClick={reset} className="mt-3 block text-xs underline">Начать заново</button>
          </div>
        )}

      </PageSection>
    </main>
  );
}

// ─── sub-components ───────────────────────────────────────────────────────────

function InfoCard({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--c-green-dim)] text-[var(--c-green)]">{icon}</span>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--c-text3)]">{label}</p>
      </div>
      {children}
    </div>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-lg bg-[var(--c-bg3)] px-2 py-1 text-xs">
      <span className="text-[var(--c-text3)]">{label}: </span>
      <span className="font-semibold text-[var(--c-text)]">{value}</span>
    </span>
  );
}

function MetricBlock({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg bg-[var(--c-bg3)] p-3">
      <p className="text-[11px] font-medium text-[var(--c-text3)]">{label}</p>
      <p className={`font-display mt-1 text-lg font-semibold tabular ${accent ? "text-[var(--c-green)]" : "text-[var(--c-text)]"}`}>{value}</p>
    </div>
  );
}

function EconomicsCard({ sellingPrice, costInput, onCostChange, category }: { sellingPrice: number; costInput: string; onCostChange: (v: string) => void; category: string }) {
  const cost = Math.max(0, Number(costInput) || 0);
  const { commissionRub, logistics, packaging, profit, margin, commission } = calcPreview(sellingPrice, cost, category);
  const color = margin >= 25 ? "text-[var(--c-green)]" : margin >= 15 ? "text-[var(--c-amber)]" : "text-[var(--c-red)]";

  return (
    <InfoCard icon={<Calculator size={18} />} label="Предварительная экономика">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 text-sm">
          <Row label="Цена продажи (медиана WB)" value={formatRub(sellingPrice)} />
          <div className="flex items-center justify-between gap-3">
            <span className="text-[var(--c-text2)]">Ваша себестоимость</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={costInput}
                onChange={(e) => onCostChange(e.target.value)}
                className="h-7 w-24 rounded border border-[var(--c-border2)] bg-[var(--c-bg3)] px-2 text-right text-sm tabular text-[var(--c-text)] outline-none focus:border-[var(--c-green)]"
              />
              <span className="text-xs text-[var(--c-text3)]">₽</span>
            </div>
          </div>
          <Row label={`Комиссия WB (${Math.round(commission * 100)}%)`} value={`−${formatRub(commissionRub)}`} dim />
          <Row label="Логистика FBO (оценка)" value={`−${formatRub(logistics)}`} dim />
          <Row label="Упаковка (оценка)" value={`−${formatRub(packaging)}`} dim />
        </div>
        <div className="flex flex-col items-center justify-center rounded-lg bg-[var(--c-bg3)] p-4 text-center">
          {cost > 0 ? (
            <>
              <p className="text-xs font-medium text-[var(--c-text3)]">Прибыль / шт</p>
              <p className={`font-display mt-1 text-3xl font-semibold tabular ${color}`}>{formatRub(profit)}</p>
              <p className={`mt-1 text-sm font-semibold ${color}`}>{margin.toFixed(1)}% маржа</p>
            </>
          ) : (
            <p className="text-sm text-[var(--c-text3)]">Введите себестоимость для расчёта прибыли</p>
          )}
        </div>
      </div>
      <p className="mt-3 text-xs text-[var(--c-text3)]">Предварительный расчёт без рекламы, хранения и возвратов · уточните в полном отчёте</p>
    </InfoCard>
  );
}

function Row({ label, value, dim }: { label: string; value: string; dim?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={dim ? "text-[var(--c-text3)]" : "text-[var(--c-text2)]"}>{label}</span>
      <span className="font-mono text-sm tabular text-[var(--c-text)]">{value}</span>
    </div>
  );
}
