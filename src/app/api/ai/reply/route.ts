import { NextRequest, NextResponse } from "next/server";
import { yandexComplete, yandexConfigured } from "@/lib/integrations/yandexAi";

// Drafts a polite Russian reply to a WB review or question via YandexGPT (RU
// LLM — compliant + reliable for Russian users). Degrades gracefully (ok:false)
// when YANDEX_AI_API_KEY / YANDEX_FOLDER_ID are absent so the UI can fall back
// to a manual reply.
export async function POST(req: NextRequest) {
  if (!yandexConfigured()) {
    return NextResponse.json(
      { ok: false, message: "ИИ не настроен — добавьте YANDEX_AI_API_KEY и YANDEX_FOLDER_ID" },
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
  const system = isReview
    ? "Ты — менеджер по работе с клиентами российского магазина на Wildberries. " +
      "Напиши короткий (1–3 предложения), вежливый и человечный ответ на отзыв покупателя на русском языке. " +
      "Поблагодари за отзыв. Если оценка низкая — извинись и предложи решение, без шаблонных штампов. " +
      "Не придумывай фактов. Выдай только текст ответа, без кавычек."
    : "Ты — менеджер магазина на Wildberries. Ответь кратко, по делу и вежливо на вопрос покупателя на русском языке. " +
      "Если данных не хватает — честно скажи, что уточнишь. Выдай только текст ответа, без кавычек.";

  const user = [
    body.product ? `Товар: ${body.product}` : null,
    isReview && body.rating ? `Оценка: ${body.rating}/5` : null,
    `${isReview ? "Отзыв" : "Вопрос"}: ${text}`,
  ]
    .filter(Boolean)
    .join("\n");

  const reply = await yandexComplete(system, user, { temperature: 0.5, maxTokens: 400 });
  if (!reply) {
    return NextResponse.json({ ok: false, message: "Не удалось сгенерировать ответ" }, { status: 200 });
  }
  return NextResponse.json({ ok: true, reply });
}
