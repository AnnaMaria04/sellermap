/** Analytics date-range model: presets, resolution and comparison periods. */

export interface DateRange {
  start: Date;
  end: Date;
}

export type PresetId =
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "last90"
  | "week_to_date"
  | "month_to_date"
  | "quarter_to_date"
  | "year_to_date"
  | "black_friday"
  | "cyber_monday"
  | "custom";

export interface PresetGroup {
  label?: string;
  items: { id: PresetId; label: string }[];
}

/** Sidebar structure mirroring the reference design. */
export const PRESET_GROUPS: PresetGroup[] = [
  { items: [{ id: "today", label: "Today" }, { id: "yesterday", label: "Yesterday" }] },
  {
    label: "Last",
    items: [
      { id: "last7", label: "Last 7 days" },
      { id: "last30", label: "Last 30 days" },
      { id: "last90", label: "Last 90 days" },
    ],
  },
  {
    label: "Period to date",
    items: [
      { id: "week_to_date", label: "Week to date" },
      { id: "month_to_date", label: "Month to date" },
      { id: "year_to_date", label: "Year to date" },
    ],
  },
  {
    items: [
      { id: "black_friday", label: "Black Friday" },
      { id: "cyber_monday", label: "Cyber Monday" },
      { id: "quarter_to_date", label: "Quarters" },
    ],
  },
  { items: [{ id: "custom", label: "Custom range" }] },
];

export const PRESET_LABELS: Record<PresetId, string> = {
  today: "Today",
  yesterday: "Yesterday",
  last7: "Last 7 days",
  last30: "Last 30 days",
  last90: "Last 90 days",
  week_to_date: "Week to date",
  month_to_date: "Month to date",
  quarter_to_date: "Quarters",
  year_to_date: "Year to date",
  black_friday: "Black Friday",
  cyber_monday: "Cyber Monday",
  custom: "Custom",
};

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** Resolve a preset to a concrete range relative to `now`. */
export function resolvePreset(id: PresetId, now = new Date()): DateRange {
  const today = startOfDay(now);
  switch (id) {
    case "today":
      return { start: today, end: endOfDay(now) };
    case "yesterday": {
      const y = addDays(today, -1);
      return { start: y, end: endOfDay(y) };
    }
    case "last7":
      return { start: addDays(today, -6), end: endOfDay(now) };
    case "last30":
      return { start: addDays(today, -29), end: endOfDay(now) };
    case "last90":
      return { start: addDays(today, -89), end: endOfDay(now) };
    case "week_to_date": {
      const dow = (today.getDay() + 6) % 7; // Monday-based
      return { start: addDays(today, -dow), end: endOfDay(now) };
    }
    case "month_to_date":
      return { start: new Date(today.getFullYear(), today.getMonth(), 1), end: endOfDay(now) };
    case "quarter_to_date": {
      const q = Math.floor(today.getMonth() / 3) * 3;
      return { start: new Date(today.getFullYear(), q, 1), end: endOfDay(now) };
    }
    case "year_to_date":
      return { start: new Date(today.getFullYear(), 0, 1), end: endOfDay(now) };
    case "black_friday": {
      const bf = new Date(today.getFullYear() - 1, 10, 28);
      return { start: startOfDay(bf), end: endOfDay(bf) };
    }
    case "cyber_monday": {
      const cm = new Date(today.getFullYear() - 1, 11, 1);
      return { start: startOfDay(cm), end: endOfDay(cm) };
    }
    case "custom":
    default:
      return { start: today, end: endOfDay(now) };
  }
}

export type ComparisonId =
  | "none"
  | "yesterday"
  | "previous_year"
  | "previous_year_dow"
  | "custom";

export const COMPARISON_OPTIONS: { id: ComparisonId; label: string }[] = [
  { id: "none", label: "No comparison" },
  { id: "yesterday", label: "Yesterday" },
  { id: "previous_year", label: "Previous year" },
  { id: "previous_year_dow", label: "Previous year (match day of week)" },
  { id: "custom", label: "Custom" },
];

/** Resolve the comparison range for a primary range. Null = no comparison. */
export function resolveComparison(primary: DateRange, id: ComparisonId): DateRange | null {
  const spanMs = primary.end.getTime() - primary.start.getTime();
  switch (id) {
    case "none":
      return null;
    case "yesterday": {
      const start = addDays(primary.start, -1);
      return { start, end: new Date(start.getTime() + spanMs) };
    }
    case "previous_year":
    case "previous_year_dow": {
      const start = new Date(primary.start);
      start.setFullYear(start.getFullYear() - 1);
      const end = new Date(primary.end);
      end.setFullYear(end.getFullYear() - 1);
      return { start, end };
    }
    case "custom":
    default: {
      const start = addDays(primary.start, -Math.ceil(spanMs / 86400000) - 1);
      return { start, end: new Date(start.getTime() + spanMs) };
    }
  }
}

export function formatRangeLabel(r: DateRange): string {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
  const s = r.start.toLocaleDateString("en-US", opts);
  const e = r.end.toLocaleDateString("en-US", opts);
  return s === e ? s : `${s} – ${e}`;
}

export const CURRENCIES = ["USD $", "EUR €", "RUB ₽", "GBP £"] as const;
export type Currency = (typeof CURRENCIES)[number];

const CURRENCY_FMT: Record<Currency, { code: string; locale: string }> = {
  "USD $": { code: "USD", locale: "en-US" },
  "EUR €": { code: "EUR", locale: "en-US" },
  "RUB ₽": { code: "RUB", locale: "ru-RU" },
  "GBP £": { code: "GBP", locale: "en-GB" },
};

export function formatMoney(value: number, currency: Currency): string {
  const { code, locale } = CURRENCY_FMT[currency];
  return new Intl.NumberFormat(locale, { style: "currency", currency: code }).format(value);
}
