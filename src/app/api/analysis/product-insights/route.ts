import { NextRequest, NextResponse } from "next/server";
import { aiComplete, aiConfigured } from "@/lib/integrations/aiProvider";

// Real product-launch insights for the /result page. Replaces the hardcoded
// "good / blockers / beforePurchase / firstTest" stub that used to live in
// calculateResult.ts. Takes a compact product context (margin, packaging,
// market position) and asks the LLM for a strict-JSON, action-first answer.

interface ProductInsightInput {
  title?: string;
  category?: string;
  sellingPrice?: number;
  marginPercent?: number;
  profitPerUnit?: number;
  breakEvenPrice?: number;
  packagingRisk?: "low" | "medium" | "high";
  packagingNote?: string;
  marketMedianPrice?: number | null;
  marketMedianReviews?: number | null;
  marketConcentration?: string | null;
  bestSearchPosition?: number | null;
  reviewCount?: number | null;
  rating?: number | null;
  snapshotCount?: number;
  competitorSummary?: string[];
}

const SYSTEM_PROMPT =
  "Ты — аналитик карточек товаров на Wildberries. По данным маржи, упаковки, рынка и текущих метрик карточки дай чёткие, действенные выводы на русском. " +
  "Не выдумывай факты — если данных мало, скажи об этом и предложи следующий шаг. Без лозунгов и общих фраз. " +
  "Отвечай СТРОГО в формате JSON без markdown: " +
  '{"good": ["…"], "blockers": ["…"], "beforePurchase": ["…"], "firstTest": ["…"]}. ' +
  "Каждый блок 1-3 строки. Без вступлений и без обёрток.";

function buildUserPrompt(input: ProductInsightInput): string {
  const lines: string[] = [];
  if (input.title) lines.push(`Товар: ${input.title}`);
  if (input.category) lines.push(`Категория: ${input.category}`);
  if (input.sellingPrice != null) lines.push(`Цена продажи: ${Math.round(input.sellingPrice)} ₽`);
  if (input.marketMedianPrice != null) lines.push(`Медиана рынка: ${Math.round(input.marketMedianPrice)} ₽`);
  if (input.marginPercent != null) lines.push(`Маржа: ${input.marginPercent.toFixed(1)}%`);
  if (input.profitPerUnit != null) lines.push(`Прибыль с единицы: ${Math.round(input.profitPerUnit)} ₽`);
  if (input.breakEvenPrice != null) lines.push(`Цена безубыточности: ${Math.round(input.breakEvenPrice)} ₽`);
  if (input.packagingRisk) lines.push(`Риск упаковки: ${input.packagingRisk}`);
  if (input.packagingNote) lines.push(`Заметка по упаковке: ${input.packagingNote}`);
  if (input.marketMedianReviews != null) lines.push(`Медиана отзывов: ${input.marketMedianReviews}`);
  if (input.marketConcentration) lines.push(`Концентрация продавцов: ${input.marketConcentration}`);
  if (input.bestSearchPosition != null) lines.push(`Лучшая позиция в поиске: №${input.bestSearchPosition}`);
  if (input.reviewCount != null) lines.push(`Отзывов у карточки: ${input.reviewCount}`);
  if (input.rating != null) lines.push(`Рейтинг карточки: ${input.rating.toFixed(2)} ★`);
  if (input.snapshotCount != null) lines.push(`Снимков в базе: ${input.snapshotCount}`);
  if (input.competitorSummary && input.competitorSummary.length > 0) {
    lines.push("Конкуренты:");
    for (const c of input.competitorSummary.slice(0, 5)) lines.push(`- ${c}`);
  }
  return lines.join("\n");
}

interface ParsedInsights {
  good: string[];
  blockers: string[];
  beforePurchase: string[];
  firstTest: string[];
}

function parseInsights(text: string): ParsedInsights | null {
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    const obj = JSON.parse(cleaned) as Partial<ParsedInsights>;
    return shape(obj);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      const obj = JSON.parse(m[0]) as Partial<ParsedInsights>;
      return shape(obj);
    } catch { return null; }
  }
}

function shape(obj: Partial<ParsedInsights>): ParsedInsights {
  const list = (v: unknown): string[] => Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean).slice(0, 5) : [];
  return {
    good: list(obj.good),
    blockers: list(obj.blockers),
    beforePurchase: list(obj.beforePurchase),
    firstTest: list(obj.firstTest),
  };
}

export async function POST(req: NextRequest) {
  if (!aiConfigured()) {
    return NextResponse.json({ ok: false, configured: false, message: "AI-провайдер не настроен" });
  }
  const body = (await req.json().catch(() => ({}))) as ProductInsightInput;
  const prompt = buildUserPrompt(body);
  if (!prompt) {
    return NextResponse.json({ ok: false, configured: true, message: "Нет данных для анализа" });
  }
  const text = await aiComplete(SYSTEM_PROMPT, prompt, { temperature: 0.4, maxTokens: 700 });
  if (!text) {
    return NextResponse.json({ ok: false, configured: true, message: "Не удалось получить ответ от модели" });
  }
  const insights = parseInsights(text);
  if (!insights) {
    return NextResponse.json({ ok: false, configured: true, message: "Модель вернула непарсируемый ответ" });
  }
  return NextResponse.json({ ok: true, configured: true, insights });
}
