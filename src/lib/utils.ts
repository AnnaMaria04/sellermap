import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRub(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value);
}

/** Canonical ruble formatter — "1 156 000 ₽". Alias of formatRub. */
export const formatRUB = formatRub;

/** Russian date — "9 марта 2026" from an ISO date/datetime. Returns "—" for empty. */
export function formatDateRu(d?: string | null) {
  if (!d) return "—";
  const date = new Date(d.length <= 10 ? `${d}T00:00:00` : d);
  if (isNaN(date.getTime())) return d;
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

/** Decimal formatter with Russian comma — 812.5 → "812,5". */
export function formatDec(value: number, digits = 1) {
  return value.toLocaleString("ru-RU", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** Percent formatter — accepts a percentage value (52.5 → "52,5 %"). */
export function formatPct(value: number) {
  return value.toLocaleString("ru-RU", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }) + " %";
}

export function scoreVerdict(score: number) {
  if (score < 40) return "Не запускать";
  if (score < 60) return "Рискованно";
  if (score < 80) return "Перспективно";
  return "Сильная возможность";
}

export function marginLabel(margin: number) {
  if (margin < 10) return "опасно";
  if (margin < 20) return "слабая";
  if (margin < 30) return "рабочая";
  return "сильная";
}
