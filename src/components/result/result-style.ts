import type { RiskLevel, ScoreStatus, SourceStatus } from "@/lib/analysis/types";

export function statusTone(status: ScoreStatus | SourceStatus | string) {
  if (status === "сильный" || status === "подключено") return "bg-soft-green text-dark-green";
  if (status === "демо" || status === "средний" || status === "ручной ввод") {
    return "bg-mint/55 text-dark-green";
  }
  if (status === "риск" || status === "ожидает API ключ") return "bg-warning/15 text-[#806000]";
  return "bg-risk/10 text-risk";
}

export function riskDot(risk: RiskLevel) {
  if (risk === "low") return "bg-primary-green";
  if (risk === "medium") return "bg-warning";
  return "bg-risk";
}

export function riskLabel(risk: RiskLevel) {
  if (risk === "low") return "низкий";
  if (risk === "medium") return "средний";
  return "высокий";
}
