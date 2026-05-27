import { NextRequest, NextResponse } from "next/server";

// WB Feedbacks API — unanswered reviews + questions. Server-side only.
const FB_BASE = "https://feedbacks-api.wildberries.ru/api/v1";

interface WbFeedback {
  id?: string;
  text?: string;
  productValuation?: number;
  createdDate?: string;
  productDetails?: { productName?: string; nmId?: number };
}
interface WbQuestion {
  id?: string;
  text?: string;
  createdDate?: string;
  productDetails?: { productName?: string; nmId?: number };
}

async function wbGet(path: string, token: string) {
  return fetch(`${FB_BASE}${path}`, {
    headers: { Authorization: token },
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
}

export async function POST(req: NextRequest) {
  const { token } = (await req.json().catch(() => ({}))) as { token?: string };
  const t = token?.trim();
  if (!t) return NextResponse.json({ ok: false, message: "Не передан токен" }, { status: 400 });

  const feedbacks: { id: string; text: string; rating: number; product: string; date: string }[] = [];
  const questions: { id: string; text: string; product: string; date: string }[] = [];

  try {
    const r = await wbGet("/feedbacks?isAnswered=false&take=50&skip=0&order=dateDesc", t);
    if (r.ok) {
      const d = (await r.json()) as { data?: { feedbacks?: WbFeedback[] } };
      for (const f of d.data?.feedbacks ?? []) {
        if (!f.id) continue;
        feedbacks.push({
          id: f.id,
          text: f.text ?? "",
          rating: f.productValuation ?? 0,
          product: f.productDetails?.productName ?? "",
          date: (f.createdDate ?? "").slice(0, 10),
        });
      }
    } else {
      console.error(`[wb/feedbacks] reviews ${r.status}`);
    }
  } catch (e) {
    console.error("[wb/feedbacks] reviews failed:", e instanceof Error ? e.message : String(e));
  }

  try {
    const r = await wbGet("/questions?isAnswered=false&take=50&skip=0&order=dateDesc", t);
    if (r.ok) {
      const d = (await r.json()) as { data?: { questions?: WbQuestion[] } };
      for (const q of d.data?.questions ?? []) {
        if (!q.id) continue;
        questions.push({
          id: q.id,
          text: q.text ?? "",
          product: q.productDetails?.productName ?? "",
          date: (q.createdDate ?? "").slice(0, 10),
        });
      }
    } else {
      console.error(`[wb/feedbacks] questions ${r.status}`);
    }
  } catch (e) {
    console.error("[wb/feedbacks] questions failed:", e instanceof Error ? e.message : String(e));
  }

  return NextResponse.json({ ok: true, feedbacks, questions });
}
