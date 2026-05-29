/** Модель диапазона дат аналитики: пресеты, разрешение и периоды сравнения. */

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

/** Структура боковой панели как в эталонном дизайне. */
export const PRESET_GROUPS: PresetGroup[] = [
  { items: [{ id: "today", label: "Сегодня" }, { id: "yesterday", label: "Вчера" }] },
  {
    label: "Последние",
    items: [
      { id: "last7", label: "Последние 7 дней" },
      { id: "last30", label: "Последние 30 дней" },
      { id: "last90", label: "Последние 90 дней" },
    ],
  },
  {
    label: "С начала периода",
    items: [
      { id: "week_to_date", label: "С начала недели" },
      { id: "month_to_date", label: "С начала месяца" },
      { id: "year_to_date", label: "С начала года" },
    ],
  },
  {
    items: [
      { id: "black_friday", label: "Чёрная пятница" },
      { id: "cyber_monday", label: "Киберпонедельник" },
      { id: "quarter_to_date", label: "Кварталы" },
    ],
  },
  { items: [{ id: "custom", label: "Произвольный период" }] },
];

export const PRESET_LABELS: Record<PresetId, string> = {
  today: "Сегодня",
  yesterday: "Вчера",
  last7: "Последние 7 дней",
  last30: "Последние 30 дней",
  last90: "Последние 90 дней",
  week_to_date: "С начала недели",
  month_to_date: "С начала месяца",
  quarter_to_date: "Кварталы",
  year_to_date: "С начала года",
  black_friday: "Чёрная пятница",
  cyber_monday: "Киберпонедельник",
  custom: "Произвольный",
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

/** Разрешить пресет в конкретный диапазон относительно `now`. */
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
      const dow = (today.getDay() + 6) % 7; // неделя с понедельника
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
  { id: "none", label: "Без сравнения" },
  { id: "yesterday", label: "Вчера" },
  { id: "previous_year", label: "Предыдущий год" },
  { id: "previous_year_dow", label: "Предыдущий год (по дню недели)" },
  { id: "custom", label: "Произвольное" },
];

/** Разрешить период сравнения для основного диапазона. null = без сравнения. */
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
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
  const s = r.start.toLocaleDateString("ru-RU", opts);
  const e = r.end.toLocaleDateString("ru-RU", opts);
  return s === e ? s : `${s} – ${e}`;
}

// Валюты только для стран СНГ. По умолчанию — рубль.
export const CURRENCIES = [
  "RUB ₽",
  "KZT ₸",
  "BYN Br",
  "UAH ₴",
  "AMD ֏",
  "AZN ₼",
  "KGS",
  "UZS",
  "TJS",
  "MDL",
] as const;
export type Currency = (typeof CURRENCIES)[number];

export const DEFAULT_CURRENCY: Currency = "RUB ₽";

const CURRENCY_FMT: Record<Currency, { code: string; locale: string }> = {
  "RUB ₽": { code: "RUB", locale: "ru-RU" },
  "KZT ₸": { code: "KZT", locale: "ru-RU" },
  "BYN Br": { code: "BYN", locale: "ru-RU" },
  "UAH ₴": { code: "UAH", locale: "ru-RU" },
  "AMD ֏": { code: "AMD", locale: "ru-RU" },
  "AZN ₼": { code: "AZN", locale: "ru-RU" },
  "KGS": { code: "KGS", locale: "ru-RU" },
  "UZS": { code: "UZS", locale: "ru-RU" },
  "TJS": { code: "TJS", locale: "ru-RU" },
  "MDL": { code: "MDL", locale: "ru-RU" },
};

export function formatMoney(value: number, currency: Currency): string {
  const { code, locale } = CURRENCY_FMT[currency] ?? CURRENCY_FMT[DEFAULT_CURRENCY];
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: code,
    maximumFractionDigits: 0,
  }).format(value);
}
