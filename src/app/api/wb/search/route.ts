import { NextRequest, NextResponse } from "next/server";
import { searchWbPublicProducts } from "@/services/wbPublicClient";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? 10);
  if (!q) return NextResponse.json({ error: "q required" }, { status: 400 });

  try {
    const products = await searchWbPublicProducts(q, Math.min(Math.max(limit, 1), 100));
    return NextResponse.json({
      source: "wb_public",
      products,
      note: "Публичный каталог WB: цены, рейтинг и отзывы без seller token. Продажи/выручка недоступны без MPStats.",
    });
  } catch {
    return NextResponse.json({ error: "WB public search error" }, { status: 502 });
  }
}
