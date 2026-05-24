import "server-only";

import type { DecisionResult } from "@/lib/analysis/decision-engine";
import type { UnitEconomicsResult } from "@/lib/analysis/economics";
import type { MarketAnalysis } from "@/lib/analysis/market-analysis";
import type { ProductFingerprint } from "@/lib/analysis/product-fingerprint";
import type { RawResultInput, RiskLevel } from "@/lib/analysis/types";
import { demoResultInput } from "@/lib/data/demoResult";
import type { SupplierProduct } from "@/lib/providers/supplier/types";
import { supabaseRest } from "@/services/supabaseRest";

type AnalysisJson = {
  supplierProduct?: SupplierProduct;
  fingerprint?: ProductFingerprint;
  marketAnalysis?: MarketAnalysis;
  economics?: UnitEconomicsResult;
  decision?: DecisionResult;
  warnings?: string[];
  providersUsed?: string[];
};

type MarketAnalysisRow = {
  id: string;
  created_at: string;
  opportunity_score: number | null;
  verdict: string | null;
  confidence_level: "low" | "medium" | "high" | null;
  analysis_json: AnalysisJson;
};

export type SavedAnalysisCard = {
  id: string;
  name: string;
  date: string;
  score: number;
  verdict: string;
  risk: string;
  status: string;
  href: string;
};

export type IntelligenceUpdate = {
  title: string;
  type: string;
  impact: string;
  summary: string;
  severity?: string;
  source?: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function verdictLabel(value?: string | null) {
  if (value === "strong_opportunity") return "Сильная возможность";
  if (value === "can_test" || value === "worth_testing") return "Можно тестировать";
  if (value === "research_more" || value === "needs_more_data") return "Нужно исследовать";
  if (value === "reject" || value === "avoid") return "Отклонить";
  if (value === "risky") return "Рискованно";
  return "Черновик";
}

export async function getLatestAnalyses(limit = 12) {
  const result = await supabaseRest<MarketAnalysisRow[]>("market_analyses", {
    query: {
      select: "id,created_at,opportunity_score,verdict,confidence_level,analysis_json",
      order: "created_at.desc",
      limit: String(limit),
    },
  });
  return result.ok ? result.data : [];
}

export function analysisToCard(row: MarketAnalysisRow): SavedAnalysisCard {
  const json = row.analysis_json ?? {};
  const title = json.supplierProduct?.productTitle || json.fingerprint?.productType || "Товар без названия";
  const margin = json.economics?.marginPercent;
  const risk = json.marketAnalysis?.reviewStats.entryReviewBarrier === "high"
    ? "барьер отзывов"
    : json.supplierProduct?.packageSize
      ? "конкуренция"
      : "упаковка";
  return {
    id: row.id,
    name: title,
    date: formatDate(row.created_at),
    score: Math.round(row.opportunity_score ?? json.decision?.opportunityScore ?? 0),
    verdict: verdictLabel(row.verdict ?? json.decision?.verdict),
    risk,
    status: typeof margin === "number" ? `Маржа ${margin.toFixed(1)}% · ${json.marketAnalysis?.competitors.length ?? 0} конкурентов` : "Нужен расчёт экономики",
    href: `/result/${row.id}`,
  };
}

export async function getDashboardData() {
  const analyses = await getLatestAnalyses(24);
  const cards = analyses.map(analysisToCard);
  const margins = analyses.map((row) => row.analysis_json?.economics?.marginPercent).filter((value): value is number => typeof value === "number");
  const scores = cards.map((card) => card.score).filter((score) => score > 0);
  const trackedProducts = await supabaseRest<Array<{ id: string }>>("tracked_products", { query: { select: "id", tracking_status: "eq.active", limit: "10000" } });
  const updates = await getPersonalizedUpdates(3);
  return {
    cards,
    updates,
    stats: [
      ["Товаров проверено", String(cards.length)],
      ["Лучшая возможность", scores.length ? String(Math.max(...scores)) : "—"],
      ["Главный риск", cards[0]?.risk ?? "нет данных"],
      ["Средняя маржа", margins.length ? `${(margins.reduce((sum, item) => sum + item, 0) / margins.length).toFixed(1)}%` : "—"],
      ["Активное отслеживание", trackedProducts.ok ? String(trackedProducts.data.length) : "—"],
      ["Алерты", String(updates.length)],
    ],
  };
}

export async function getPersonalizedUpdates(limit = 9): Promise<IntelligenceUpdate[]> {
  const stored = await supabaseRest<Array<{
    title: string;
    update_type: string;
    severity: string | null;
    explanation: string | null;
    recommended_action: string | null;
    source: string | null;
  }>>("weekly_updates", {
    query: { select: "title,update_type,severity,explanation,recommended_action,source", order: "created_at.desc", limit: String(limit) },
  });
  if (stored.ok && stored.data.length) {
    return stored.data.map((row) => ({
      title: row.title,
      type: row.update_type,
      impact: row.severity === "high" ? "Высокое влияние" : row.severity === "low" ? "Низкое влияние" : "Среднее влияние",
      summary: [row.explanation, row.recommended_action].filter(Boolean).join(" · "),
      severity: row.severity ?? "medium",
      source: row.source ?? "rule_based",
    }));
  }

  const analyses = await getLatestAnalyses(limit);
  return analyses.map((row) => {
    const json = row.analysis_json;
    const title = json.supplierProduct?.productTitle || json.fingerprint?.productType || "Сохранённый товар";
    const barrier = json.marketAnalysis?.reviewStats.entryReviewBarrier;
    const margin = json.economics?.marginPercent;
    return {
      title: barrier === "high" ? `Высокий барьер отзывов: ${title}` : `Проверить экономику: ${title}`,
      type: barrier === "high" ? "competition" : "margin",
      impact: margin && margin < 20 ? "Может снизить решение" : "Требует проверки",
      summary: barrier === "high"
        ? "Топ конкурентов накопил много отзывов. Перед закупкой нужен сильный визуал и отличие оффера."
        : "SellerMap обновит вывод после новых снимков цены, отзывов и конкурентов.",
      severity: barrier === "high" ? "high" : "medium",
      source: "rule_based",
    };
  });
}

function riskFromReviewBarrier(value?: string): RiskLevel {
  if (value === "high") return "high";
  if (value === "medium") return "medium";
  return "low";
}

export async function getAnalysisResultInput(id: string): Promise<RawResultInput | null> {
  const result = await supabaseRest<MarketAnalysisRow[]>("market_analyses", {
    query: { select: "id,created_at,opportunity_score,verdict,confidence_level,analysis_json", id: `eq.${id}`, limit: "1" },
  });
  if (!result.ok || !result.data[0]) return null;
  return analysisRowToResultInput(result.data[0]);
}

export function analysisRowToResultInput(row: MarketAnalysisRow): RawResultInput {
  const json = row.analysis_json ?? {};
  const supplier = json.supplierProduct;
  const fingerprint = json.fingerprint;
  const market = json.marketAnalysis;
  const economics = json.economics;
  const decision = json.decision;
  const fallback = demoResultInput;
  const packageSize = supplier?.packageSize;
  const title = supplier?.productTitle || fingerprint?.productType || fallback.title;
  const competitors = (market?.competitors ?? []).slice(0, 12).map((product, index) => ({
    name: product.title,
    nmId: product.nmId,
    imageUrl: product.imageUrl ?? undefined,
    price: product.priceRub ?? 0,
    rating: product.rating ?? 0,
    reviews: product.reviewCount ?? 0,
    position: product.searchPosition ?? index + 1,
    estimatedMonthlySales: product.estimatedMonthlySales ?? 0,
    estimatedRevenue: product.estimatedMonthlyRevenue ?? 0,
    strength: product.reviewCount && product.reviewCount > 1000 ? "много отзывов" : "видимость в поиске",
    weakness: product.priceRub && market?.priceStats.median && product.priceRub < market.priceStats.median * 0.8 ? "давит ценой" : "нужно изучить карточку",
    positioning: product.priceRub && market?.priceStats.median && product.priceRub > market.priceStats.median ? "выше медианы" : "ниже/около медианы",
    aiInsight: "Данные из собственного WB collector: продажи не считаются точными, используем прокси спроса.",
    x: Math.min(95, Math.max(8, 20 + index * 7)),
    y: Math.min(92, Math.max(12, (product.reviewCount ?? 0) / 40)),
    bubbleSize: Math.min(85, Math.max(24, (product.reviewCount ?? 0) / 40)),
    riskLevel: riskFromReviewBarrier(market?.reviewStats.entryReviewBarrier),
  }));

  return {
    ...fallback,
    nmId: competitors[0]?.nmId ?? fallback.nmId,
    title,
    category: fingerprint?.categoryGuess ?? fallback.category,
    categoryId: fingerprint?.categoryGuess ?? fallback.categoryId,
    summary: decision?.mainReasons.join(" · ") || "Результат построен по сохранённому анализу SellerMap.",
    updatedAt: formatDate(row.created_at),
    marginInput: {
      sellingPrice: economics?.targetPriceRub ?? fallback.marginInput.sellingPrice,
      costPrice: economics?.landedCostRub ?? fallback.marginInput.costPrice,
      wbCommission: (economics?.wbCommissionPercent ?? 15) / 100,
      wbLogistics: economics?.wbLogisticsRub ?? fallback.marginInput.wbLogistics,
      packagingCost: economics?.packagingCostRub ?? fallback.marginInput.packagingCost,
      adSpend: Math.round((economics?.adSpendRub ?? 0) * 100) || fallback.marginInput.adSpend,
      storagePerMonth: fallback.marginInput.storagePerMonth,
      returnRate: (economics?.returnBufferPercent ?? 5) / 100,
      unitsPerMonth: Math.max(30, Math.min(300, Math.round((market?.demand.demandScore ?? 50) * 2))),
      taxRate: (economics?.taxPercent ?? 6) / 100,
    },
    packagingInput: {
      ...fallback.packagingInput,
      lengthCm: packageSize?.lengthCm ?? fallback.packagingInput.lengthCm,
      widthCm: packageSize?.widthCm ?? fallback.packagingInput.widthCm,
      heightCm: packageSize?.heightCm ?? fallback.packagingInput.heightCm,
      weightKg: supplier?.grossWeightKg ?? fallback.packagingInput.weightKg,
      category: fingerprint?.categoryGuess ?? fallback.packagingInput.category,
      currency: supplier?.currency === "CNY" || supplier?.currency === "USD" ? supplier.currency : "RUB",
    },
    dataSources: [
      {
        source: (json.providersUsed ?? ["own-wb"]).join(" → "),
        status: "подключено",
        lastUpdated: formatDate(row.created_at),
        confidence: decision?.confidenceLevel === "high" ? 82 : decision?.confidenceLevel === "medium" ? 62 : 38,
        note: "Конкуренты WB собраны через provider ladder; продажи конкурентов не заявляются как точные.",
      },
      {
        source: "SellerMap flywheel",
        status: "подключено",
        lastUpdated: formatDate(row.created_at),
        confidence: row.confidence_level === "high" ? 80 : row.confidence_level === "medium" ? 60 : 35,
        note: "Анализ сохранён в Supabase и используется для отслеживания ниши.",
      },
    ],
    competitors: competitors.length ? competitors : fallback.competitors,
    supplier: {
      supplierUrl: supplier?.supplierUrl ?? fallback.supplier.supplierUrl,
      supplierPrice: supplier?.supplierPriceMin ?? fallback.supplier.supplierPrice,
      moq: supplier?.moq ?? fallback.supplier.moq,
      shippingPrice: supplier?.shippingPerUnit ?? fallback.supplier.shippingPrice,
      unitWeightKg: supplier?.grossWeightKg ?? fallback.supplier.unitWeightKg,
      cartonSize: packageSize ? `${packageSize.lengthCm ?? "?"} x ${packageSize.widthCm ?? "?"} x ${packageSize.heightCm ?? "?"} см` : fallback.supplier.cartonSize,
      leadTimeDays: fallback.supplier.leadTimeDays,
      currency: supplier?.currency === "CNY" || supplier?.currency === "USD" ? supplier.currency : "RUB",
      supplierNotes: (json.warnings ?? []).slice(0, 3).join(" · ") || fallback.supplier.supplierNotes,
    },
  };
}
