"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ScoreRing } from "@/components/result/ScoreRing";
import { CostBar } from "@/components/result/CostBar";
import { MarketHistogram } from "@/components/result/MarketHistogram";
import { PriceRatingScatter } from "@/components/result/PriceRatingScatter";
import { CompetitorTable } from "@/components/result/CompetitorTable";
import { calculateResult } from "@/lib/analysis/calculateResult";
import { formatRub } from "@/lib/utils";
import { getDraft } from "@/services/draftStorage";
import type { MarginInput, ProductResult, RawResultInput } from "@/lib/analysis/types";
import type { ProductAnalysisDraft } from "@/types/sellermap";

type Tab = "margin" | "market" | "audit" | "insights";
const TABS: { id: Tab; label: string }[] = [
  { id: "margin", label: "Маржа" },
  { id: "market", label: "Рынок" },
  { id: "audit", label: "Карточка" },
  { id: "insights", label: "Выводы" },
];

function scoreColor(s: number) {
  return s >= 70 ? "var(--c-green)" : s >= 50 ? "var(--c-amber)" : "var(--c-red)";
}
function scoreLabel(s: number) {
  return s >= 80 ? "Сильный результат" : s >= 65 ? "Выше среднего" : s >= 50 ? "Требует доработки" : "Высокий риск";
}
function riskColor(r: string) {
  return r === "low" ? "var(--c-green)" : r === "medium" ? "var(--c-amber)" : "var(--c-red)";
}
function riskLabel(r: string) {
  return r === "low" ? "низкий" : r === "medium" ? "средний" : "высокий";
}
function rub(value: number | null | undefined) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? formatRub(Math.round(numeric)) : "—";
}

export function ResultClient({ initialInput, draftId }: { initialInput: RawResultInput; draftId?: string }) {
  const router = useRouter();
  const [draft] = useState<ProductAnalysisDraft | null>(() => (draftId ? getDraft(draftId) : null));
  const [input, setInput] = useState(() => (draft ? inputFromDraft(initialInput, draft) : initialInput));
  const result = useMemo(() => calculateResult(input), [input]);
  const [tab, setTab] = useState<Tab>("margin");

  const updateMargin = useCallback((marginInput: MarginInput) => {
    setInput((c) => ({ ...c, marginInput }));
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
    <div style={{ minHeight: "100vh", background: "var(--c-bg)" }}>
      {/* Breadcrumb */}
      <div style={{ maxWidth: 1060, margin: "0 auto", padding: "18px 28px 0", display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--c-text2)" }}>
        <Link href="/reports" style={{ color: "var(--c-text2)" }}>Отчёты</Link>
        <span style={{ color: "var(--c-text3)" }}>›</span>
        <span style={{ color: "var(--c-text)" }}>{result.title}</span>
        <div style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 20, background: "var(--c-bg2)", border: "1px solid var(--c-border)", fontSize: 11, color: "var(--c-text2)", flexShrink: 0 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--c-green)", display: "inline-block" }} />
          {result.updatedAt}
        </div>
      </div>

      {/* Hero */}
      <HeroSection result={result} />

      {/* KPI Row */}
      <KpiRow result={result} />

      {/* Sticky Tab Bar */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(12,14,15,0.94)", backdropFilter: "blur(14px)", borderBottom: "1px solid var(--c-border)" }}>
        <div style={{ maxWidth: 1060, margin: "0 auto", padding: "0 28px", display: "flex", gap: 1, overflowX: "auto" }}>
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding: "11px 16px", fontSize: 13, fontWeight: tab === t.id ? 600 : 400, color: tab === t.id ? "var(--c-text)" : "var(--c-text2)", background: "none", border: "none", borderBottom: tab === t.id ? "2px solid var(--c-green)" : "2px solid transparent", marginBottom: -1, cursor: "pointer", transition: "all .14s", whiteSpace: "nowrap" }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div style={{ maxWidth: 1060, margin: "0 auto", padding: "28px 28px 80px" }}>
        {tab === "margin" && <MarginTab result={result} onInputChange={updateMargin} />}
        {tab === "market" && <MarketTab result={result} />}
        {tab === "audit" && <AuditTabView result={result} />}
        {tab === "insights" && <InsightsTab result={result} />}
      </div>
    </div>
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
      <Link
        href="/check"
        className="mt-5 inline-flex h-11 items-center justify-center rounded-lg bg-[var(--c-green)] px-5 text-sm font-semibold text-[var(--c-bg)] transition hover:bg-[#25e890]"
      >
        Начать новую проверку
      </Link>
    </div>
  );
}

/* ── Hero ── */
function HeroSection({ result }: { result: ProductResult }) {
  const m = result.margin;
  const s = result.score;
  const col = scoreColor(s);
  return (
    <div style={{ maxWidth: 1060, margin: "14px auto 0", padding: "0 28px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", borderRadius: 16, overflow: "hidden", border: "1px solid var(--c-border)", background: "var(--c-bg2)" }}>
        {/* Score panel */}
        <div style={{ padding: "32px 24px", borderRight: "1px solid var(--c-border)", display: "flex", flexDirection: "column", gap: 14, position: "relative", background: "var(--c-bg2)" }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: "var(--c-green)", borderRadius: "3px 0 0 3px" }} />
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--c-text2)", textTransform: "uppercase", letterSpacing: ".1em" }}>Итоговое решение</div>
          <div style={{ lineHeight: 1 }}>
            <span style={{ fontSize: 72, fontWeight: 800, color: col, fontFamily: "JetBrains Mono, monospace", lineHeight: 1 }}>{s}</span>
            <span style={{ fontSize: 24, fontWeight: 400, color: "var(--c-text2)", fontFamily: "JetBrains Mono, monospace" }}>/100</span>
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", padding: "5px 12px", borderRadius: 20, background: "rgba(31,209,131,0.12)", border: "1px solid rgba(31,209,131,0.28)", fontSize: 11, fontWeight: 600, color: "var(--c-green)", width: "fit-content" }}>
            {scoreLabel(s)}
          </div>
          <div style={{ marginTop: "auto", display: "flex", gap: 6, flexWrap: "wrap" }}>
            <PillBadge label={`Маржа: ${result.margin.riskLabel}`} level={result.margin.riskLabel === "сильная" ? "low" : result.margin.riskLabel === "рабочая" ? "medium" : "high"} />
            <PillBadge label={`Упаковка: ${riskLabel(result.packaging.riskLevel)}`} level={result.packaging.riskLevel} />
          </div>
        </div>

        {/* Product info */}
        <div style={{ padding: "24px 28px" }}>
          <div style={{ fontSize: 11, color: "var(--c-text2)", marginBottom: 10 }}>
            арт. {result.nmId} · {result.category} · обновлено: {result.updatedAt}
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--c-text)", lineHeight: 1.2, marginBottom: 6, letterSpacing: "-.02em" }}>{result.title}</h1>
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--c-text)", marginBottom: 4, lineHeight: 1.4 }}>{result.verdict}</p>
          <p style={{ fontSize: 12, color: "var(--c-text2)", lineHeight: 1.65, marginBottom: 18, maxWidth: 560 }}>{result.summary}</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 12 }}>
            {[
              ["Маржа", `${m.marginPercent.toFixed(1)}%`, m.marginPercent >= 20 ? "low" : m.marginPercent >= 12 ? "medium" : "high"],
              ["Прибыль / шт", rub(m.profitPerUnit), m.profitPerUnit >= 200 ? "low" : m.profitPerUnit > 0 ? "medium" : "high"],
              ["Риск упаковки", riskLabel(result.packaging.riskLevel), result.packaging.riskLevel],
            ].map(([k, v, r]) => (
              <div key={String(k)} style={{ padding: "10px 12px", background: "var(--c-bg3)", borderRadius: 8, border: "1px solid var(--c-border)" }}>
                <div style={{ fontSize: 10, color: "var(--c-text2)", marginBottom: 4 }}>{k}</div>
                <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 17, fontWeight: 700, color: riskColor(String(r)) }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: "var(--c-text2)", marginBottom: 16 }}>
            Безопасная цена: <span style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--c-text)", fontWeight: 600 }}>{rub(m.safePriceMin)} – {rub(m.safePriceMax)}</span>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid var(--c-border2)", background: "transparent", color: "var(--c-text)", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>↓ Сохранить отчёт</button>
            <Link href="/check" style={{ padding: "9px 18px", borderRadius: 8, background: "var(--c-green)", color: "var(--c-bg)", fontSize: 13, fontWeight: 600, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>↗ Проверить другой товар</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── KPI Row ── */
function KpiRow({ result }: { result: ProductResult }) {
  const m = result.margin;
  const kpis = [
    { label: "Прибыль / шт", value: rub(m.profitPerUnit), sub: `Маржа ${m.marginPercent.toFixed(1)}%`, risk: m.marginPercent >= 20 ? "low" : m.marginPercent >= 12 ? "medium" : "high" },
    { label: "Прибыль / месяц", value: rub(m.monthlyProfit), sub: `при ${m.unitsPerMonth} прод.`, risk: undefined },
    { label: "Точка безубыточности", value: rub(m.breakEvenPrice), sub: "мин. цена", risk: undefined },
    { label: "Конкурентов", value: String(result.competitors.length), sub: "в выборке", risk: undefined },
  ];
  return (
    <div style={{ maxWidth: 1060, margin: "0 auto", padding: "12px 28px 0" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {kpis.map((kpi) => (
          <div key={kpi.label} style={{ background: "var(--c-bg2)", border: "1px solid var(--c-border)", borderRadius: 8, padding: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--c-text2)", marginBottom: 5 }}>{kpi.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "JetBrains Mono, monospace", color: kpi.risk ? riskColor(kpi.risk) : "var(--c-text)", lineHeight: 1.1 }}>{kpi.value}</div>
            {kpi.sub && <div style={{ fontSize: 11, color: "var(--c-text2)", marginTop: 4 }}>{kpi.sub}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Section heading ── */
function Sh({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--c-text)" }}>{title}</h3>
      {sub && <p style={{ fontSize: 12, color: "var(--c-text2)", marginTop: 3, lineHeight: 1.5 }}>{sub}</p>}
    </div>
  );
}
function Hr() {
  return <div style={{ height: 1, background: "var(--c-border)", margin: "24px 0" }} />;
}

/* ── MARGIN TAB ── */
function MarginTab({ result }: { result: ProductResult; onInputChange: (m: MarginInput) => void }) {
  const m = result.margin;
  const p = result.packaging;

  const costs = [
    { label: "Себестоимость", value: m.costPrice, color: "#4f77e8" },
    { label: `Комиссия WB ${Math.round(m.wbCommission * 100)}%`, value: m.commissionPerUnit, color: "var(--c-green)" },
    { label: "Логистика WB", value: m.wbLogistics, color: "#6bba8a" },
    { label: "Упаковка", value: m.packagingCost, color: "#a0d4a0" },
    { label: "Налог", value: m.taxPerUnit, color: "var(--c-text3)" },
    ...(m.profitPerUnit > 0 ? [{ label: "Прибыль", value: m.profitPerUnit, color: "#1fd183" }] : []),
  ].filter((c) => c.value > 0);

  const maxDelta = Math.max(...m.sensitivity.map((r) => Math.abs(r.marginDelta)));

  return (
    <div style={{ animation: "fadeUp .2s ease both" }}>
      {/* Safe price banner */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderRadius: 12, background: "rgba(31,209,131,0.08)", border: "1px solid rgba(31,209,131,0.25)", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--c-green)", letterSpacing: ".04em", marginBottom: 4 }}>Безопасная цена</div>
          <div style={{ fontSize: 13, color: "var(--c-text)", fontWeight: 500 }}>Минимальная цена для маржи ≥15%</div>
          {m.sellingPrice < m.safePriceMin && (
            <div style={{ fontSize: 12, color: "var(--c-red)", marginTop: 3 }}>Текущая цена {rub(m.sellingPrice)} — ниже безопасного порога</div>
          )}
        </div>
        <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 20 }}>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 32, fontWeight: 700, color: "var(--c-green)", lineHeight: 1 }}>{rub(m.safePriceMin)}</div>
          <div style={{ fontSize: 11, color: "var(--c-text2)", marginTop: 3 }}>до {rub(m.safePriceMax)}</div>
        </div>
      </div>

      <Sh title={`Структура цены ${rub(m.sellingPrice)}`} sub="Из чего складывается розничная цена — наведите на сегмент для деталей" />
      <CostBar costs={costs} />
      <Hr />

      <Sh title="Чувствительность маржи" sub="Отсортировано по размеру влияния — чем длиннее бар, тем серьёзнее сценарий" />
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {m.sensitivity.map((r, i) => {
          const a = Math.abs(r.marginDelta);
          const bc = a < 4 ? "var(--c-text3)" : a < 8 ? "var(--c-amber)" : "var(--c-red)";
          return (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "156px 1fr 72px 70px", alignItems: "center", gap: 14, padding: "9px 12px", borderRadius: 6, background: i % 2 === 0 ? "var(--c-bg2)" : "transparent" }}>
              <span style={{ fontSize: 13, color: "var(--c-text)" }}>{r.label}</span>
              <div style={{ height: 6, borderRadius: 3, background: "var(--c-bg3)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.round((a / maxDelta) * 100)}%`, borderRadius: 3, background: bc, transition: "width .5s ease" }} />
              </div>
              <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: bc, textAlign: "right" }}>{rub(r.profitDelta)}</span>
              <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: "var(--c-text2)", textAlign: "right" }}>→ {(m.marginPercent + r.marginDelta).toFixed(1)}%</span>
            </div>
          );
        })}
        <div style={{ display: "flex", gap: 16, marginTop: 8, paddingLeft: 12, fontSize: 11, color: "var(--c-text3)" }}>
          <span><span style={{ color: "var(--c-text3)", fontWeight: 600 }}>●</span> малое</span>
          <span><span style={{ color: "var(--c-amber)", fontWeight: 600 }}>●</span> среднее</span>
          <span><span style={{ color: "var(--c-red)", fontWeight: 600 }}>●</span> высокое влияние</span>
        </div>
      </div>
      <Hr />

      <Sh title="Упаковка и логистика" />
      <div style={{ padding: 18, borderRadius: 8, background: "var(--c-amber-dim)", border: "1px solid var(--c-amber)", marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--c-amber)", marginBottom: 8 }}>Риск упаковки: {riskLabel(p.riskLevel)} — {p.marginImpactPoints.toFixed(1)} п.п. маржи</div>
        <p style={{ fontSize: 13, color: "var(--c-text)", lineHeight: 1.65 }}>{p.note}</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, padding: "12px 16px", background: "var(--c-bg2)", border: "1px solid var(--c-border)", borderRadius: 8 }}>
        {[
          ["Габариты", `${p.lengthCm}×${p.widthCm}×${p.heightCm} см`],
          ["Вес", `${p.weightKg} кг`],
          ["Упаковка/шт", rub(p.packagingCostPerUnit)],
          ["Логистика WB", rub(p.wbLogisticsEstimate)],
        ].map(([k, v]) => (
          <div key={String(k)}>
            <div style={{ fontSize: 10, color: "var(--c-text2)", marginBottom: 2 }}>{k}</div>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, fontWeight: 600, color: "var(--c-text)" }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── MARKET TAB ── */
function MarketTab({ result }: { result: ProductResult }) {
  const m = result.margin;
  const sortedByPrice = [...result.competitors].sort((a, b) => a.price - b.price);
  const priceMin = sortedByPrice[0]?.price ?? 0;
  const priceMax = sortedByPrice[sortedByPrice.length - 1]?.price ?? 0;
  const segmentSize = (priceMax - priceMin) / 3 || 1000;
  const segments = [
    { label: "Нижний", range: [priceMin, priceMin + segmentSize] as [number, number], ours: m.sellingPrice < priceMin + segmentSize },
    { label: "Средний", range: [priceMin + segmentSize, priceMin + 2 * segmentSize] as [number, number], ours: m.sellingPrice >= priceMin + segmentSize && m.sellingPrice < priceMin + 2 * segmentSize },
    { label: "Верхний", range: [priceMin + 2 * segmentSize, priceMax + 200] as [number, number], ours: m.sellingPrice >= priceMin + 2 * segmentSize },
  ];
  const segmentShares = segments.map((seg) => ({
    ...seg,
    share: Math.round((result.competitors.filter((c) => c.price >= seg.range[0] && c.price < seg.range[1]).length / Math.max(result.competitors.length, 1)) * 100),
  }));

  return (
    <div style={{ animation: "fadeUp .2s ease both" }}>
      <Sh title="Распределение цен" sub="Кол-во товаров по ценовым диапазонам · P25 / медиана / P75 указаны внизу" />
      <MarketHistogram competitors={result.competitors} ourPrice={m.sellingPrice} />
      <Hr />

      <Sh title="Цена vs. рейтинг" sub="Размер точки = кол-во отзывов · наведите для деталей" />
      <PriceRatingScatter competitors={result.competitors} ourPrice={m.sellingPrice} />
      <Hr />

      <Sh title="Конкурентный срез" sub="Отсортировано по продажам в месяц" />
      <CompetitorTable competitors={result.competitors} ourPrice={m.sellingPrice} />
      <Hr />

      <Sh title="Ценовые сегменты" />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {segmentShares.map((seg) => (
          <div key={seg.label} style={{
            display: "grid", gridTemplateColumns: "130px 1fr 48px", alignItems: "center", gap: 16,
            padding: "11px 16px", borderRadius: 8,
            background: seg.ours ? "rgba(31,209,131,0.08)" : "var(--c-bg2)",
            border: `1px solid ${seg.ours ? "rgba(31,209,131,0.25)" : "var(--c-border)"}`,
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: seg.ours ? 600 : 400, color: "var(--c-text)", display: "flex", alignItems: "center", gap: 6 }}>
                {seg.label}
                {seg.ours && <span style={{ fontSize: 10, color: "var(--c-green)", background: "rgba(31,209,131,0.12)", padding: "1px 5px", borderRadius: 3, fontWeight: 600 }}>мы</span>}
              </div>
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "var(--c-text2)", marginTop: 2 }}>
                {rub(seg.range[0])} – {rub(seg.range[1])}
              </div>
            </div>
            <div style={{ height: 5, background: "var(--c-bg3)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${seg.share}%`, background: seg.ours ? "var(--c-green)" : "var(--c-text3)", borderRadius: 3, transition: "width .6s ease" }} />
            </div>
            <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 13, color: seg.ours ? "var(--c-green)" : "var(--c-text2)", textAlign: "right", fontWeight: seg.ours ? 600 : 400 }}>{seg.share}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── AUDIT TAB ── */
function AuditTabView({ result }: { result: ProductResult }) {
  const ok = result.cardAudit.filter((a) => a.status === "сильный").length;
  const total = result.cardAudit.length;
  const auditScore = total > 0 ? Math.round((ok / total) * 100) : 0;
  const icons: Record<string, string> = { сильный: "✓", средний: "!", риск: "✕", "слабое место": "✕" };
  const colors: Record<string, string> = { сильный: "var(--c-green)", средний: "var(--c-amber)", риск: "var(--c-red)", "слабое место": "var(--c-red)" };
  const bgColors: Record<string, string> = { сильный: "var(--c-green-dim)", средний: "var(--c-amber-dim)", риск: "var(--c-red-dim)", "слабое место": "var(--c-red-dim)" };

  return (
    <div style={{ animation: "fadeUp .2s ease both" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "16px 20px", background: "var(--c-bg2)", borderRadius: 8, border: "1px solid var(--c-border)", marginBottom: 24 }}>
        <ScoreRing score={auditScore} size={76} />
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--c-text)" }}>Качество карточки товара</div>
          <div style={{ fontSize: 13, color: "var(--c-text2)", marginTop: 3 }}>{ok} из {total} критериев выполнено</div>
          <div style={{ fontSize: 11, color: "var(--c-text2)", marginTop: 4 }}>Компонент общей оценки {result.score} · влияет на видимость в поиске WB</div>
          {auditScore < 70 && <div style={{ fontSize: 12, color: "var(--c-amber)", marginTop: 8 }}>Необходимо доработать перед запуском рекламы</div>}
        </div>
      </div>
      {result.cardAudit.map((item, i) => (
        <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 0", borderBottom: "1px solid var(--c-border)" }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: bgColors[item.status] ?? "var(--c-bg3)", color: colors[item.status] ?? "var(--c-text2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>
            {icons[item.status] ?? "·"}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--c-text)", marginBottom: 2 }}>{item.label}</div>
            <div style={{ fontSize: 12, color: "var(--c-text2)", lineHeight: 1.55 }}>{item.explanation}</div>
            {item.action && <div style={{ fontSize: 11, color: "var(--c-green)", marginTop: 4 }}>{item.action}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── INSIGHTS TAB ── */
function InsightsTab({ result }: { result: ProductResult }) {
  const risks = result.aiInsights.blockers;
  const opportunities = result.aiInsights.good;
  const sevColor = (s: string) => s === "critical" ? "var(--c-green)" : s === "recommended" ? "var(--c-amber)" : "var(--c-text3)";
  const sevLabel = (s: string) => s === "critical" ? "Критично" : s === "recommended" ? "Важно" : "Желательно";

  // Build action items from checklist
  const actions = result.checklist.map((text, i) => ({
    text,
    severity: i === 0 ? "critical" : i < 3 ? "recommended" : "optional",
  }));

  const [done, setDone] = useState<Set<number>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem("sm-actions") ?? "[]") as number[]); } catch { return new Set(); }
  });
  const toggle = (i: number) => {
    const n = new Set(done);
    if (n.has(i)) n.delete(i);
    else n.add(i);
    setDone(n);
    try { localStorage.setItem("sm-actions", JSON.stringify([...n])); } catch { /* ignore */ }
  };

  return (
    <div style={{ animation: "fadeUp .2s ease both" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 28 }}>
        <div style={{ padding: 18, borderRadius: 8, background: "var(--c-red-dim)", border: "1px solid var(--c-red)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--c-red)", marginBottom: 14 }}>Риски ({risks.length})</div>
          {risks.map((r, i) => (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: i < risks.length - 1 ? 10 : 0 }}>
              <span style={{ color: "var(--c-red)", fontSize: 13, flexShrink: 0 }}>✕</span>
              <span style={{ fontSize: 13, color: "var(--c-text)", lineHeight: 1.55 }}>{r}</span>
            </div>
          ))}
        </div>
        <div style={{ padding: 18, borderRadius: 8, background: "var(--c-green-dim)", border: "1px solid var(--c-green)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--c-green)", marginBottom: 14 }}>Возможности ({opportunities.length})</div>
          {opportunities.map((o, i) => (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: i < opportunities.length - 1 ? 10 : 0 }}>
              <span style={{ color: "var(--c-green)", fontSize: 13, flexShrink: 0 }}>↑</span>
              <span style={{ fontSize: 13, color: "var(--c-text)", lineHeight: 1.55 }}>{o}</span>
            </div>
          ))}
        </div>
      </div>

      <Sh title="План действий" sub="Приоритет сверху вниз · нажмите для отметки выполненного · прогресс сохраняется" />
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {actions.map((a, i) => {
          const isDone = done.has(i);
          return (
            <div key={i} onClick={() => toggle(i)}
              style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "11px 14px", borderRadius: 8, background: "var(--c-bg2)", border: "1px solid var(--c-border)", cursor: "pointer", opacity: isDone ? 0.5 : 1, transition: "opacity .15s" }}>
              <div style={{ width: 18, height: 18, borderRadius: 4, border: `1.5px solid ${isDone ? "var(--c-green)" : "var(--c-border2)"}`, background: isDone ? "var(--c-green)" : "transparent", flexShrink: 0, marginTop: 1, display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s" }}>
                {isDone && <span style={{ color: "var(--c-bg)", fontSize: 11, fontWeight: 700, lineHeight: 1 }}>✓</span>}
              </div>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: sevColor(a.severity), flexShrink: 0, marginTop: 5 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: isDone ? "var(--c-text2)" : "var(--c-text)", textDecoration: isDone ? "line-through" : "none", lineHeight: 1.55 }}>{a.text}</div>
                <div style={{ fontSize: 10, color: sevColor(a.severity), marginTop: 2, fontWeight: 600, letterSpacing: ".04em" }}>{sevLabel(a.severity)}</div>
              </div>
            </div>
          );
        })}
        <p style={{ fontSize: 11, color: "var(--c-text3)", marginTop: 4, paddingLeft: 2 }}>Прогресс сохраняется автоматически</p>
      </div>
    </div>
  );
}

/* ── Pill Badge ── */
function PillBadge({ label, level }: { label: string; level: "low" | "medium" | "high" | "ok" }) {
  const col = level === "low" || level === "ok" ? "var(--c-green)" : level === "medium" ? "var(--c-amber)" : "var(--c-red)";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 20, background: "var(--c-bg3)", border: "1px solid var(--c-border)", fontSize: 12, fontWeight: 500, color: "var(--c-text)", whiteSpace: "nowrap" }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: col, flexShrink: 0 }} />
      {label}
    </span>
  );
}

/* ── inputFromDraft (keep existing logic unchanged) ── */
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
