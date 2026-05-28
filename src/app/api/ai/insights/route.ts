import { NextRequest, NextResponse } from "next/server";
import { yandexComplete, yandexConfigured } from "@/lib/integrations/yandexAi";
import { SYSTEM_PROMPT, buildUserPrompt, parseInsights, type InsightSummary } from "@/lib/ai/insights";

export async function POST(req: NextRequest) {
  if (!yandexConfigured()) {
    return NextResponse.json({
      ok: false,
      configured: false,
      message: "YandexGPT не настроен — добавьте YANDEX_AI_API_KEY и YANDEX_FOLDER_ID",
    });
  }

  const summary = (await req.json().catch(() => ({}))) as InsightSummary;
  const prompt = buildUserPrompt(summary);
  if (!prompt) {
    return NextResponse.json({ ok: false, configured: true, message: "Нет данных для анализа" });
  }

  const text = await yandexComplete(SYSTEM_PROMPT, prompt, { temperature: 0.4, maxTokens: 800 });
  if (!text) {
    return NextResponse.json({ ok: false, configured: true, message: "Не удалось получить ответ от YandexGPT" });
  }

  const insights = parseInsights(text);
  return NextResponse.json({ ok: true, configured: true, insights });
}
