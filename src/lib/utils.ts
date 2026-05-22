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
