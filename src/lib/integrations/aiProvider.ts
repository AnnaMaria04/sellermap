// Provider-agnostic AI completion. Routes to DeepSeek by default (stronger at
// analytical reasoning) and falls back to YandexGPT (152-ФЗ-clean, RU-resident)
// when DeepSeek isn't configured. Operators can force a provider per-deployment
// via AI_PROVIDER=deepseek|yandex.
import { deepseekConfigured, deepseekComplete } from "./deepseekAi";
import { yandexConfigured, yandexComplete } from "./yandexAi";

export type AIProvider = "deepseek" | "yandex";

export function aiProviderName(): AIProvider | null {
  const forced = process.env.AI_PROVIDER?.toLowerCase();
  if (forced === "deepseek" && deepseekConfigured()) return "deepseek";
  if (forced === "yandex" && yandexConfigured()) return "yandex";
  if (deepseekConfigured()) return "deepseek";
  if (yandexConfigured()) return "yandex";
  return null;
}

export function aiConfigured(): boolean {
  return aiProviderName() !== null;
}

export async function aiComplete(
  system: string,
  user: string,
  opts?: { temperature?: number; maxTokens?: number; model?: string },
): Promise<string | null> {
  const provider = aiProviderName();
  if (provider === "deepseek") return deepseekComplete(system, user, opts);
  if (provider === "yandex") return yandexComplete(system, user, opts);
  return null;
}
