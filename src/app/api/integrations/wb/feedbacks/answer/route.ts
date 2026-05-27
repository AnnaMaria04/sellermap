import { NextRequest, NextResponse } from "next/server";

const FB_BASE = "https://feedbacks-api.wildberries.ru/api/v1";

// Post an approved reply back to WB (review or question). Server-side only.
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    token?: string; kind?: "review" | "question"; id?: string; text?: string;
  };
  const token = body.token?.trim();
  const id = body.id?.trim();
  const text = body.text?.trim();
  if (!token || !id || !text) {
    return NextResponse.json({ ok: false, message: "Не хватает данных" }, { status: 400 });
  }

  const isReview = body.kind !== "question";
  const url = isReview ? `${FB_BASE}/feedbacks/answer` : `${FB_BASE}/questions`;
  const init: RequestInit = {
    method: isReview ? "POST" : "PATCH",
    headers: { Authorization: token, "Content-Type": "application/json" },
    body: JSON.stringify(isReview ? { id, text } : { id, answer: { text }, state: "wbRu" }),
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  };

  try {
    const r = await fetch(url, init);
    if (!r.ok) {
      const t = await r.text().catch(() => "");
      console.error(`[wb/feedbacks/answer] ${r.status}: ${t.slice(0, 200)}`);
      return NextResponse.json({ ok: false, message: `WB ${r.status}` }, { status: 200 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[wb/feedbacks/answer] failed:", e instanceof Error ? e.message : String(e));
    return NextResponse.json({ ok: false, message: "Не удалось отправить ответ" }, { status: 200 });
  }
}
