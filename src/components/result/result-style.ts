import type { RiskLevel, ScoreStatus, SourceStatus } from "@/lib/analysis/types";

export function statusTone(status: ScoreStatus | SourceStatus | string) {
  if (status === "сильный" || status === "подключено" || status === "активен") {
    return "bg-[var(--c-green-dim)] text-[var(--c-green)]";
  }
  if (status === "готов" || status === "средний" || status === "риск" || status === "ожидает API ключ") {
    return "bg-[var(--c-amber-dim)] text-[var(--c-amber)]";
  }
  if (status === "не подключён" || status === "демо" || status === "ручной ввод") {
    return "bg-[var(--c-bg3)] text-[var(--c-text3)]";
  }
  return "bg-[var(--c-red-dim)] text-[var(--c-red)]";
}

export function riskDot(risk: RiskLevel) {
  if (risk === "low") return "bg-[var(--c-green)]";
  if (risk === "medium") return "bg-[var(--c-amber)]";
  return "bg-[var(--c-red)]";
}

export function riskLabel(risk: RiskLevel) {
  if (risk === "low") return "низкий";
  if (risk === "medium") return "средний";
  return "высокий";
}
