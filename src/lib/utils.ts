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
  if (score < 40) return "Avoid";
  if (score < 60) return "Risky";
  if (score < 80) return "Promising";
  return "Strong opportunity";
}

export function marginLabel(margin: number) {
  if (margin < 10) return "Dangerous";
  if (margin < 20) return "Weak";
  if (margin < 30) return "Acceptable";
  return "Strong";
}
