// Real card audit. Replaces the seed-driven `cardAuditSeed.map(scoreStatus)`
// path in calculateResult.ts. Pulls real WB card health metrics from
// wb_product_snapshots + the keyword coverage from tracked_keywords, and turns
// them into the CardAuditItem[] the UI consumes.
//
// Two surfaces:
//   - calculateCardAudit(...) — pure, takes already-loaded snapshots + keywords
//     and a market context (median price / reviews). Unit-tested.
//   - loadCardAuditData(supabase, nmId) — read-only query helper. Returns the
//     raw rows the calculator needs.
import type { SupabaseClient } from "@supabase/supabase-js";
import { scoreStatus } from "./calculateResult";
import type { CardAuditItem } from "./types";

export interface CardAuditSnapshot {
  rating: number | null;
  review_count: number | null;
  search_position: number | null;
  image_url: string | null;
  ad_visibility: boolean | null;
  price_rub: number | null;
  estimated_monthly_sales: number | null;
  query: string | null;
  created_at: string;
}

export interface CardAuditMarketContext {
  medianPrice: number | null;
  medianReviews: number | null;
  top10MedianReviews: number | null;
}

export interface CardAuditData {
  snapshots: CardAuditSnapshot[];
  trackedKeywords: string[];
  marketContext: CardAuditMarketContext | null;
}

/** Clamp x to [0, 100] and round to an integer. */
function clamp100(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(100, Math.round(x)));
}

/** Logistic curve mapping value/midpoint → score in [0,100]. */
function logScore(value: number, midpoint: number, max = 100): number {
  if (value <= 0 || midpoint <= 0) return 0;
  const ratio = Math.log10(value + 1) / Math.log10(midpoint * 3 + 1);
  return clamp100(ratio * max);
}

/** Produces the full set of CardAuditItem rows for the product. Always returns
 *  the same audit dimensions so the UI layout stays stable when data is sparse. */
export function calculateCardAudit(
  data: CardAuditData,
): CardAuditItem[] {
  const { snapshots, trackedKeywords, marketContext } = data;
  const latest = snapshots[0];

  // Aggregates across snapshots.
  const ratings = snapshots.map((s) => Number(s.rating ?? 0)).filter((n) => Number.isFinite(n) && n > 0);
  const reviewCounts = snapshots.map((s) => Number(s.review_count ?? 0)).filter((n) => Number.isFinite(n) && n >= 0);
  const positions = snapshots.map((s) => Number(s.search_position ?? 0)).filter((n) => Number.isFinite(n) && n > 0);
  const adVisibleCount = snapshots.filter((s) => s.ad_visibility === true).length;
  const hasImage = snapshots.some((s) => typeof s.image_url === "string" && s.image_url.length > 0);
  const distinctQueries = new Set(
    snapshots.map((s) => (s.query ?? "").trim().toLowerCase()).filter(Boolean),
  );
  const monthlySales = snapshots
    .map((s) => Number(s.estimated_monthly_sales ?? 0))
    .filter((n) => Number.isFinite(n) && n > 0);

  // Helpers
  const avg = (arr: number[]) => (arr.length === 0 ? 0 : arr.reduce((s, v) => s + v, 0) / arr.length);
  const min = (arr: number[]) => (arr.length === 0 ? 0 : Math.min(...arr));

  const items: CardAuditItem[] = [];

  // 1. Main image
  items.push((() => {
    const score = hasImage ? 100 : 0;
    return {
      label: "Главное изображение",
      score,
      status: scoreStatus(score),
      explanation: hasImage
        ? "Главное изображение найдено в последних снимках карточки."
        : "В последних снимках нет URL главного изображения — карточка теряет CTR в поиске.",
      action: hasImage
        ? "Сверить, что главное фото 900×1200, без водяных знаков."
        : "Загрузить главное фото в WB Seller (рекомендуем 900×1200 jpg).",
    };
  })());

  // 2. Rating
  items.push((() => {
    const r = avg(ratings); // 0..5
    const score = clamp100(((r - 3) / 2) * 100 + 50); // 3.0★ → 50, 5.0★ → 100, ≤2★ → 0
    return {
      label: "Рейтинг карточки",
      score,
      status: scoreStatus(score),
      explanation: r > 0
        ? `Средний рейтинг по ${ratings.length} снимкам: ${r.toFixed(2)} ★.`
        : "Рейтинг ещё не собран в снимках.",
      action: r >= 4.6
        ? "Поддерживать сервис и быстро отвечать на отзывы 1-3★."
        : r > 0
          ? "Поднять рейтинг через регулярные ответы и работу с возвратами."
          : "Собрать первые отзывы — запустить тестовую партию.",
    };
  })());

  // 3. Reviews vs market
  items.push((() => {
    const count = Math.max(...reviewCounts, 0);
    const midpoint = marketContext?.medianReviews && marketContext.medianReviews > 0
      ? marketContext.medianReviews
      : 200;
    const score = logScore(count, midpoint);
    const medianStr = marketContext?.medianReviews
      ? `медиана рынка ${marketContext.medianReviews}`
      : "медиана рынка пока неизвестна";
    return {
      label: "Глубина отзывов",
      score,
      status: scoreStatus(score),
      explanation: count > 0
        ? `Карточка набрала ${count} отзывов · ${medianStr}.`
        : "Отзывов в последних снимках не зафиксировано.",
      action: count < midpoint
        ? "Запустить выкупы с честными отзывами / промо первых клиентов."
        : "Объём отзывов конкурентный — фокус на качестве и фото отзывов.",
    };
  })());

  // 4. Search position (lower = better)
  items.push((() => {
    const best = positions.length === 0 ? 0 : min(positions);
    // pos 1 → 100, pos 10 → 80, pos 50 → 20, pos ≥100 → 0
    const score = best === 0 ? 0 : clamp100(100 - Math.log10(best) * 50);
    return {
      label: "Позиция в поиске",
      score,
      status: scoreStatus(score),
      explanation: best > 0
        ? `Лучшая зафиксированная позиция — №${best} по ${distinctQueries.size} запросам.`
        : "Позиция в поиске не зафиксирована.",
      action: best === 0 || best > 30
        ? "Усилить SEO заголовка + ключевые слова, попробовать рекламный буст."
        : "Удержать топ — следить за CTR и стоком.",
    };
  })());

  // 5. Ad visibility
  items.push((() => {
    const share = snapshots.length === 0 ? 0 : adVisibleCount / snapshots.length;
    const score = clamp100(share * 100);
    return {
      label: "Видимость в рекламе",
      score,
      status: scoreStatus(score),
      explanation: snapshots.length > 0
        ? `Видимость с рекламной полки в ${adVisibleCount} из ${snapshots.length} снимков (${Math.round(share * 100)}%).`
        : "Снимков для оценки рекламы недостаточно.",
      action: share < 0.3
        ? "Включить рекламные кампании WB Авто/Поиск, мониторить дневной бюджет."
        : "Реклама стабильная — оптимизировать ставки и геокластеры.",
    };
  })());

  // 6. Keyword coverage
  items.push((() => {
    const count = Math.max(distinctQueries.size, trackedKeywords.length);
    const score = clamp100((count / 10) * 100);
    return {
      label: "Покрытие запросов",
      score,
      status: scoreStatus(score),
      explanation: count > 0
        ? `Карточка попадала в выдачу по ${count} запросам.`
        : "Покрытие запросов не зафиксировано.",
      action: count < 10
        ? "Расширить ключевые слова: добавить связанные запросы и синонимы."
        : "Покрытие сильное — следить за позицией по топ-10 запросам.",
    };
  })());

  // 7. Price vs market
  items.push((() => {
    const median = marketContext?.medianPrice ?? 0;
    const productPrice = Number(latest?.price_rub ?? 0);
    if (median <= 0 || productPrice <= 0) {
      const score = 50;
      return {
        label: "Цена vs медиана рынка",
        score,
        status: scoreStatus(score),
        explanation: "Не хватает данных, чтобы сравнить цену с медианой рынка.",
        action: "Запустить парсер рынка по основному запросу.",
      };
    }
    const deviation = Math.abs(productPrice - median) / median; // 0..1+
    // Within 20% of median = 100; 100% deviation = 0.
    const score = clamp100(100 - deviation * 100);
    const direction = productPrice > median ? "выше" : "ниже";
    return {
      label: "Цена vs медиана рынка",
      score,
      status: scoreStatus(score),
      explanation: `Ваша цена ${Math.round(productPrice)} ₽ · ${Math.round(deviation * 100)}% ${direction} медианы ${Math.round(median)} ₽.`,
      action: deviation > 0.3
        ? "Проверить позиционирование — большое отклонение от медианы режет конверсию."
        : "Цена в коридоре рынка — следить за акциями конкурентов.",
    };
  })());

  // 8. Sales depth
  items.push((() => {
    const sales = Math.max(...monthlySales, 0);
    const score = logScore(sales, 200);
    return {
      label: "Глубина продаж",
      score,
      status: scoreStatus(score),
      explanation: sales > 0
        ? `Оценка продаж по последнему снимку: ${Math.round(sales)} шт/мес.`
        : "Оценка продаж недоступна в последних снимках.",
      action: sales >= 200
        ? "Зафиксировать запас, чтобы не упасть в out-of-stock."
        : "Поднять трафик: реклама, акции, отзывы с фото.",
    };
  })());

  return items;
}

type AnyClient = SupabaseClient<any, any, any>;

/** Loads the snapshots + tracked keywords + market context the audit needs. */
export async function loadCardAuditData(
  supabase: AnyClient,
  nmId: string,
): Promise<CardAuditData> {
  const [snapshotsRes, keywordsRes] = await Promise.all([
    supabase
      .from("wb_product_snapshots")
      .select("rating,review_count,search_position,image_url,ad_visibility,price_rub,estimated_monthly_sales,query,created_at")
      .eq("nm_id", nmId)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("tracked_keywords")
      .select("keyword,tracking_status")
      .neq("tracking_status", "archived")
      .limit(50),
  ]);

  const snapshots = ((snapshotsRes.data as CardAuditSnapshot[] | null) ?? []);
  const trackedKeywords = ((keywordsRes.data as Array<{ keyword: string }> | null) ?? [])
    .map((k) => k.keyword)
    .filter(Boolean);

  // Market context: pull the latest daily_market_metrics row for the dominant
  // query in the snapshots (best-effort; falls back to null if unknown).
  let marketContext: CardAuditMarketContext | null = null;
  const dominantQuery = snapshots
    .map((s) => (s.query ?? "").trim().toLowerCase())
    .filter(Boolean)[0];
  if (dominantQuery) {
    const { data } = await supabase
      .from("daily_market_metrics")
      .select("median_price,median_reviews,top10_median_reviews")
      .eq("keyword", dominantQuery)
      .order("date", { ascending: false })
      .limit(1);
    const row = data?.[0] as { median_price: number | null; median_reviews: number | null; top10_median_reviews: number | null } | undefined;
    if (row) {
      marketContext = {
        medianPrice: row.median_price ?? null,
        medianReviews: row.median_reviews ?? null,
        top10MedianReviews: row.top10_median_reviews ?? null,
      };
    }
  }

  return { snapshots, trackedKeywords, marketContext };
}
