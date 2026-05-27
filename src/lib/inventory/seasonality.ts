import type { StockMovement } from "@/mock/inventory";

// ── Russian commercial calendar ─────────────────────────────────────────────
// Hardcoded demand events (Phase 1 "calendar awareness"). Each event carries a
// plain-language uplift hint and the categories it typically drives, so the app
// can warn a seller to restock before the spike.

export interface DemandEvent {
  id: string;
  name: string;
  month: number; // 1-12
  day: number;
  categories: string[];
  hint: string;
}

export const RUSSIAN_DEMAND_EVENTS: DemandEvent[] = [
  { id: "ny",        name: "Новый год",                 month: 1,  day: 1,  categories: ["Подарки", "Продукты", "Декор", "Алкоголь"], hint: "Пик трат — за неделю до праздника" },
  { id: "feb14",     name: "День святого Валентина",    month: 2,  day: 14, categories: ["Подарки", "Цветы", "Сладости"],            hint: "Подарки, цветы, рестораны" },
  { id: "feb23",     name: "23 февраля",                month: 2,  day: 23, categories: ["Подарки", "Алкоголь", "Инструменты"],      hint: "Мужские подарки и алкоголь, до +180%" },
  { id: "mar8",      name: "8 марта",                   month: 3,  day: 8,  categories: ["Цветы", "Подарки", "Сладости", "Косметика"], hint: "Крупнейший подарочный праздник в РФ" },
  { id: "may",       name: "Майские праздники",         month: 5,  day: 1,  categories: ["Сад", "Дача", "Инструменты", "Гриль"],     hint: "Дачный сезон — товары для улицы" },
  { id: "school",    name: "1 сентября",                month: 9,  day: 1,  categories: ["Канцтовары", "Одежда", "Электроника"],     hint: "Подготовка к школе" },
  { id: "1111",      name: "Распродажа 11.11",          month: 11, day: 11, categories: ["Электроника", "Одежда"],                   hint: "Мега-распродажа WB/Ozon — всплеск объёма" },
  { id: "ny-prep",   name: "Подготовка к Новому году",  month: 12, day: 15, categories: ["Подарки", "Продукты", "Декор"],            hint: "Закупка подарков и продуктов" },
];

const DAY_MS = 86_400_000;

/** Next calendar occurrence of an event relative to `from` (rolls into next year if passed). */
export function nextOccurrence(event: DemandEvent, from: Date): Date {
  const y = from.getFullYear();
  let d = new Date(y, event.month - 1, event.day);
  d.setHours(0, 0, 0, 0);
  const base = new Date(from); base.setHours(0, 0, 0, 0);
  if (d.getTime() < base.getTime()) d = new Date(y + 1, event.month - 1, event.day);
  return d;
}

export interface UpcomingEvent { event: DemandEvent; date: Date; daysUntil: number }

/** Events whose next occurrence falls within `withinDays`, soonest first. */
export function upcomingEvents(from: Date, withinDays: number): UpcomingEvent[] {
  const base = new Date(from); base.setHours(0, 0, 0, 0);
  return RUSSIAN_DEMAND_EVENTS
    .map((event) => {
      const date = nextOccurrence(event, base);
      const daysUntil = Math.round((date.getTime() - base.getTime()) / DAY_MS);
      return { event, date, daysUntil };
    })
    .filter((u) => u.daysUntil >= 0 && u.daysUntil <= withinDays)
    .sort((a, b) => a.daysUntil - b.daysUntil);
}

// ── Sales seasonality ────────────────────────────────────────────────────────

/** ISO-ish week of year (1-53). Stable enough for weekly bucketing. */
export function weekOfYear(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = (d.getUTCDay() + 6) % 7; // Mon=0
  d.setUTCDate(d.getUTCDate() - dayNum + 3); // nearest Thursday
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
  return 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * DAY_MS));
}

/** Units sold per sale movement (returns reduce sales). Ignores non-sale types. */
function saleUnits(m: StockMovement): number {
  if (m.type === "sale") return Math.abs(m.qtyDelta);
  return 0;
}

export interface WeeklyPoint { weekStart: string; units: number }

/** Units sold per calendar week for the last `weeks` weeks (oldest→newest). */
export function salesByWeek(movements: StockMovement[], weeks: number, now: Date = new Date()): WeeklyPoint[] {
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  // Snap to Monday of the current week.
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const buckets: WeeklyPoint[] = Array.from({ length: weeks }, (_, i) => {
    const d = new Date(start); d.setDate(d.getDate() - (weeks - 1 - i) * 7);
    return { weekStart: d.toISOString().slice(0, 10), units: 0 };
  });
  const firstMs = new Date(buckets[0].weekStart).getTime();
  for (const m of movements) {
    const u = saleUnits(m);
    if (u === 0) continue;
    const t = new Date(m.createdAt).getTime();
    if (isNaN(t) || t < firstMs) continue;
    const idx = Math.floor((t - firstMs) / (7 * DAY_MS));
    if (idx >= 0 && idx < buckets.length) buckets[idx].units += u;
  }
  return buckets;
}

export interface SeasonIndex { week: number; index: number; samples: number }

/**
 * Seasonality index per week-of-year: avg sales that week / avg sales all weeks.
 * Needs enough history to be meaningful (see `hasEnoughHistory`).
 */
export function seasonalityIndex(movements: StockMovement[], productId?: string): SeasonIndex[] {
  const byWeek = new Map<number, { total: number; samples: Set<string> }>();
  let grandTotal = 0;
  let grandSamples = 0;
  for (const m of movements) {
    if (productId && m.productId !== productId) continue;
    const u = saleUnits(m);
    if (u === 0) continue;
    const d = new Date(m.createdAt);
    if (isNaN(d.getTime())) continue;
    const w = weekOfYear(d);
    const rec = byWeek.get(w) ?? { total: 0, samples: new Set<string>() };
    rec.total += u;
    rec.samples.add(`${d.getFullYear()}-${w}`);
    byWeek.set(w, rec);
    grandTotal += u;
    grandSamples += 1;
  }
  if (grandSamples === 0) return [];
  // Average units per (week-of-year × distinct year sample).
  const overallAvg =
    grandTotal / [...byWeek.values()].reduce((s, r) => s + r.samples.size, 0);
  const result: SeasonIndex[] = [];
  for (const [week, rec] of byWeek) {
    const weekAvg = rec.total / rec.samples.size;
    result.push({ week, index: overallAvg > 0 ? weekAvg / overallAvg : 0, samples: rec.samples.size });
  }
  return result.sort((a, b) => a.week - b.week);
}

/** True once there's enough sales history for seasonality to mean something (~12 weeks). */
export function hasEnoughHistory(movements: StockMovement[]): boolean {
  const dates = movements.filter((m) => m.type === "sale").map((m) => new Date(m.createdAt).getTime()).filter((t) => !isNaN(t));
  if (dates.length < 8) return false;
  const span = Math.max(...dates) - Math.min(...dates);
  return span >= 12 * 7 * DAY_MS;
}

export interface WeekForecast { weekStart: string; weekOfYear: number; expectedUnits: number; index: number }

/**
 * Simple next-N-week forecast: recent baseline (avg weekly units over the last
 * `baselineWeeks`) scaled by the week-of-year seasonality index. Falls back to a
 * flat baseline when history is too thin for a reliable index.
 */
export function forecastWeeks(
  movements: StockMovement[],
  opts: { productId?: string; weeks?: number; baselineWeeks?: number; now?: Date } = {},
): WeekForecast[] {
  const { productId, weeks = 4, baselineWeeks = 8, now = new Date() } = opts;
  const filtered = productId ? movements.filter((m) => m.productId === productId) : movements;
  const recent = salesByWeek(filtered, baselineWeeks, now);
  const baseline = recent.reduce((s, p) => s + p.units, 0) / Math.max(1, recent.length);
  const idx = new Map(seasonalityIndex(movements, productId).map((s) => [s.week, s.index]));
  const useIndex = hasEnoughHistory(filtered);

  const monday = new Date(now); monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return Array.from({ length: weeks }, (_, i) => {
    const d = new Date(monday); d.setDate(d.getDate() + (i + 1) * 7);
    const w = weekOfYear(d);
    const index = useIndex ? (idx.get(w) ?? 1) : 1;
    return {
      weekStart: d.toISOString().slice(0, 10),
      weekOfYear: w,
      expectedUnits: Math.round(baseline * index),
      index,
    };
  });
}
