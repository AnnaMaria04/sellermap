import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

let client: Anthropic | null = null;

function getAnthropicClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is required");
  }
  client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, category, price, competitors, auditNotes } = body;

    const prompt = `Ты SEO-специалист по маркетплейсу Wildberries Россия. Создай карточку товара. Верни ТОЛЬКО JSON без markdown:
{
  "title": "SEO-заголовок до 100 символов с ключевыми словами для WB поиска",
  "description": "Продающее описание 400-600 символов с ключевыми словами и выгодами покупателя, без эмодзи",
  "keywords": "25-30 поисковых фраз через запятую, которые реально ищут на Wildberries",
  "attributes": "Заполненные характеристики в формате Параметр: Значение, каждый с новой строки"
}

Товар: ${name}
Категория: ${category}
Цена: ₽${price}
Слабости конкурентов: ${auditNotes}
Конкурентные наблюдения: ${JSON.stringify(competitors)}
Учти эти слабости и сделай карточку лучше.`;

    const message = await getAnthropicClient().messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1200,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content
      .map((block) => ("text" in block ? block.text : ""))
      .join("");
    const json = JSON.parse(text.replace(/```json|```/g, "").trim());

    return NextResponse.json(json);
  } catch (error) {
    const message =
      error instanceof Error && error.message === "ANTHROPIC_API_KEY is required"
        ? "ANTHROPIC_API_KEY required"
        : "Card generation error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
