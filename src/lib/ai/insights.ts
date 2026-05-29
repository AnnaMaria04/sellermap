/** AI insights — Phase 2.4 of the roadmap. The model receives a compact data
 *  summary (revenue, top products, alerts, upcoming demand events) and returns
 *  a small list of actionable cards. We ask for strict JSON to keep the UI
 *  predictable. Runs server-side only. */

export type InsightSeverity = "info" | "warning" | "critical";

export interface Insight {
  type: "revenue" | "stock" | "pricing" | "tax" | "demand" | "other";
  severity: InsightSeverity;
  headline: string;
  body: string;
  /** Optional CTA. The client decides what to do with it. */
  action?: { label: string; href?: string };
}

export interface InsightSummary {
  /** Revenue + counts for the last 30 days (already filtered to realized orders). */
  revenue30d?: number;
  prevRevenue30d?: number;
  orderCount30d?: number;
  realizedToday?: { revenue: number; orders: number };
  /** Stock health snapshot. */
  outOfStock?: number;
  lowStock?: number;
  productsWithoutCost?: number;
  /** Channel split for context. */
  channels?: { name: string; revenue: number }[];
  /** Upcoming demand events (next 30 days, max ~5 entries). */
  upcomingEvents?: { name: string; daysUntil: number; hint: string }[];
  /** Quarterly tax info if surfaced. */
  nextTaxPaymentDays?: number;
  nextTaxAmount?: number;
  /** Free-form notes the caller can pass in. */
  notes?: string[];
}

export const SYSTEM_PROMPT =
  "Ты — аналитик для российского селлера на Wildberries/Ozon и физического магазина. " +
  "По данным выручки, остатков, сезонности и налогов сгенерируй 2-5 коротких карточек-инсайтов на русском. " +
  "Каждый инсайт должен быть конкретным, действенным и нетривиальным (не «выручка снизилась» — а ПОЧЕМУ и ЧТО ДЕЛАТЬ). " +
  "Отвечай СТРОГО в формате JSON без markdown: " +
  '{"insights":[{"type":"revenue|stock|pricing|tax|demand|other","severity":"info|warning|critical","headline":"…","body":"…","action":{"label":"…","href":"/inventory/…"}}]}. ' +
  "Без вступлений и без обёрток. Максимум 5 инсайтов.";

export function buildUserPrompt(s: InsightSummary): string {
  const lines: string[] = [];
  if (s.revenue30d != null) {
    lines.push(`Выручка за 30 дней: ${s.revenue30d.toLocaleString("ru-RU")} ₽`);
    if (s.prevRevenue30d != null) {
      const delta = s.prevRevenue30d > 0 ? ((s.revenue30d - s.prevRevenue30d) / s.prevRevenue30d) * 100 : 0;
      lines.push(`Изменение к предыдущему периоду: ${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`);
    }
  }
  if (s.orderCount30d != null) lines.push(`Заказов реализовано (30 дней): ${s.orderCount30d}`);
  if (s.realizedToday) lines.push(`Сегодня: ${s.realizedToday.orders} заказа на ${s.realizedToday.revenue.toLocaleString("ru-RU")} ₽`);
  if (s.outOfStock != null) lines.push(`Товаров нет в наличии: ${s.outOfStock}`);
  if (s.lowStock != null) lines.push(`Заканчиваются: ${s.lowStock}`);
  if (s.productsWithoutCost != null && s.productsWithoutCost > 0) {
    lines.push(`Товаров без себестоимости: ${s.productsWithoutCost} (P&L может быть некорректным)`);
  }
  if (s.channels && s.channels.length > 0) {
    lines.push(`По каналам: ${s.channels.map((c) => `${c.name} ${c.revenue.toLocaleString("ru-RU")} ₽`).join(", ")}`);
  }
  if (s.upcomingEvents && s.upcomingEvents.length > 0) {
    lines.push(`Ближайшие события спроса: ${s.upcomingEvents.map((e) => `${e.name} (через ${e.daysUntil} дн., ${e.hint})`).join("; ")}`);
  }
  if (s.nextTaxPaymentDays != null) {
    lines.push(`До следующего авансового платежа: ${s.nextTaxPaymentDays} дн.${s.nextTaxAmount != null ? `, расчётно ${s.nextTaxAmount.toLocaleString("ru-RU")} ₽` : ""}`);
  }
  if (s.notes) lines.push(...s.notes);
  return lines.join("\n");
}

/** Extract { insights: [...] } from the LLM output, tolerating wrappers. */
export function parseInsights(text: string): Insight[] {
  if (!text) return [];
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    const obj = JSON.parse(cleaned) as { insights?: Insight[] };
    return Array.isArray(obj.insights) ? obj.insights.slice(0, 5) : [];
  } catch {
    // Fallback: try to find a JSON block inside.
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (!m) return [];
    try {
      const obj = JSON.parse(m[0]) as { insights?: Insight[] };
      return Array.isArray(obj.insights) ? obj.insights.slice(0, 5) : [];
    } catch {
      return [];
    }
  }
}
