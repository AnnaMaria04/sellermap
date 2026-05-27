import { NextRequest, NextResponse } from "next/server";

// Wildberries Content API — seller's product cards. The token (category
// "Контент") is sent server-side only; never exposed to the browser or a third
// party. Auth header is the raw token (WB does not use a "Bearer " prefix).
const CONTENT_LIST_URL = "https://content-api.wildberries.ru/content/v2/get/cards/list";

interface WbSize {
  skus?: string[];
}
interface WbCard {
  nmID?: number;
  vendorCode?: string;
  title?: string;
  subjectName?: string;
  brand?: string;
  sizes?: WbSize[];
}
interface WbCursor {
  updatedAt?: string;
  nmID?: number;
  total?: number;
}

type RawProduct = {
  externalId: string;
  name: string;
  sku?: string;
  barcode?: string;
};

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { token?: string; test?: boolean };
  const token = body.token?.trim();
  const test = body.test === true;
  if (!token) {
    return NextResponse.json({ ok: false, message: "Не передан токен «Контент»" }, { status: 400 });
  }

  const limit = test ? 1 : 100;
  const products: RawProduct[] = [];
  let cursor: { limit: number; updatedAt?: string; nmID?: number } = { limit };

  try {
    for (let page = 0; page < 25; page++) {
      const res = await fetch(CONTENT_LIST_URL, {
        method: "POST",
        headers: { Authorization: token, "Content-Type": "application/json" },
        body: JSON.stringify({ settings: { cursor, filter: { withPhoto: -1 } } }),
        cache: "no-store",
        signal: AbortSignal.timeout(20000),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        // Diagnostic: status + body snippet (never the token).
        console.error(`[wb/cards] ${CONTENT_LIST_URL} -> ${res.status}: ${txt.slice(0, 300)}`);
        if (res.status === 401) {
          return NextResponse.json(
            { ok: false, message: "Неверный или просроченный токен (нужен доступ «Контент»)" },
            { status: 200 },
          );
        }
        if (res.status === 429) {
          return NextResponse.json(
            { ok: false, message: "WB: превышен лимит запросов, попробуйте позже" },
            { status: 200 },
          );
        }
        return NextResponse.json(
          { ok: false, message: `WB API ${res.status}: ${txt.slice(0, 200)}` },
          { status: 200 },
        );
      }

      const data = (await res.json()) as { cards?: WbCard[]; cursor?: WbCursor };
      const cards = data.cards ?? [];

      if (test) {
        return NextResponse.json({ ok: true, count: cards.length });
      }

      for (const c of cards) {
        if (c.nmID == null) continue;
        products.push({
          externalId: String(c.nmID),
          name: c.title || c.subjectName || c.vendorCode || `nm ${c.nmID}`,
          sku: c.vendorCode,
          barcode: c.sizes?.[0]?.skus?.[0],
        });
      }

      const returned = data.cursor?.total ?? cards.length;
      if (returned < limit) break; // last page
      cursor = { limit, updatedAt: data.cursor?.updatedAt, nmID: data.cursor?.nmID };
    }

    return NextResponse.json({ ok: true, count: products.length, products });
  } catch (e) {
    console.error("[wb/cards] fetch failed:", e instanceof Error ? e.message : String(e));
    return NextResponse.json({ ok: false, message: "Не удалось связаться с WB API" }, { status: 200 });
  }
}
