import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

// Drafts a polite Russian reply to a WB review or question. Needs
// ANTHROPIC_API_KEY; degrades gracefully (ok:false) when it's absent so the UI
// can fall back to a manual reply.
export async function POST(req: NextRequest) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return NextResponse.json(
      { ok: false, message: "AI не настроен — добавьте ANTHROPIC_API_KEY" },
      { status: 200 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    kind?: "review" | "question";
    text?: string;
    rating?: number;
    product?: string;
  };
  const text = body.text?.trim();
  if (!text) return NextResponse.json({ ok: false, message: "Пустой текст" }, { status: 400 });

  const isReview = body.kind !== "question";
  const sys = isReview
    ? "Ты — менеджер по работе с клиентами российского интернет-магазина на Wildberries. " +
      "Напиши короткий (1–3 предложения), вежливый и человечный ответ на отзыв покупателя на русском языке. " +
      "Поблагодари за отзыв. Если оценка низкая — извинись и предложи решение, без шаблонных штампов. " +
      "Не придумывай фактов. Только текст ответа, без кавычек."
    : "Ты — менеджер магазина на Wildberries. Ответь кратко, по делу и вежливо на вопрос покупателя на русском языке. " +
      "Если не хватает данных — честно скажи, что уточнишь. Только текст ответа, без кавычек.";

  const user = [
    body.product ? `Товар: ${body.product}` : null,
    isReview && body.rating ? `Оценка: ${body.rating}/5` : null,
    `${isReview ? "Отзыв" : "Вопрос"}: ${text}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const client = new Anthropic({ apiKey: key });
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      system: sys,
      messages: [{ role: "user", content: user }],
    });
    const reply = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    return NextResponse.json({ ok: true, reply });
  } catch (e) {
    console.error("[ai/reply] failed:", e instanceof Error ? e.message : String(e));
    return NextResponse.json({ ok: false, message: "Ошибка генерации ответа" }, { status: 200 });
  }
}
