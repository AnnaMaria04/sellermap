import { NextRequest, NextResponse } from "next/server";
import { aiComplete, aiConfigured, aiProviderName } from "@/lib/integrations/aiProvider";
import { SYSTEM_PROMPT, buildUserPrompt, parseInsights, type InsightSummary } from "@/lib/ai/insights";

export async function POST(req: NextRequest) {
  if (!aiConfigured()) {
    return NextResponse.json({
      ok: false,
      configured: false,
      message: "AI-провайдер не настроен",
    });
  }

  const summary = (await req.json().catch(() => ({}))) as InsightSummary;
  const prompt = buildUserPrompt(summary);
  if (!prompt) {
    return NextResponse.json({ ok: false, configured: true, message: "Нет данных для анализа" });
  }

  const text = await aiComplete(SYSTEM_PROMPT, prompt, { temperature: 0.4, maxTokens: 800 });
  if (!text) {
    return NextResponse.json({
      ok: false, configured: true,
      message: `Не удалось получить ответ от ${aiProviderName() ?? "AI"}`,
    });
  }

  const insights = parseInsights(text);
  return NextResponse.json({ ok: true, configured: true, provider: aiProviderName(), insights });
}
