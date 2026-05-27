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
  price?: number;
  stock?: number;
};

/** Best-effort enrich with price (Prices API) and stock (Statistics API) using
 *  the same token. If the token lacks those scopes the calls fail and price/
 *  stock are left unset — cards still import. */
async function enrich(token: string, products: RawProduct[]) {
  const byNm = new Map(products.map((p) => [p.externalId, p]));

  try {
    const r = await fetch(
      "https://discounts-prices-api.wildberries.ru/api/v2/list/goods/filter?limit=1000&offset=0",
      { headers: { Authorization: token }, cache: "no-store", signal: AbortSignal.timeout(20000) },
    );
    if (r.ok) {
      const d = (await r.json()) as {
        data?: { listGoods?: { nmID?: number; sizes?: { price?: number; discountedPrice?: number }[] }[] };
      };
      for (const g of d.data?.listGoods ?? []) {
        const p = byNm.get(String(g.nmID));
        if (p) { const s = g.sizes?.[0]; p.price = s?.discountedPrice ?? s?.price; }
      }
    } else {
      console.error(`[wb/prices] ${r.status}`);
    }
  } catch (e) {
    console.error("[wb/prices] failed:", e instanceof Error ? e.message : String(e));
  }

  try {
    const r = await fetch(
      "https://statistics-api.wildberries.ru/api/v1/supplier/stocks?dateFrom=2019-01-01",
      { headers: { Authorization: token }, cache: "no-store", signal: AbortSignal.timeout(30000) },
    );
    if (r.ok) {
      const rows = (await r.json()) as { nmId?: number; quantity?: number }[];
      const sums = new Map<string, number>();
      for (const row of Array.isArray(rows) ? rows : []) {
        const k = String(row.nmId);
        sums.set(k, (sums.get(k) ?? 0) + (row.quantity ?? 0));
      }
      for (const [k, q] of sums) { const p = byNm.get(k); if (p) p.stock = q; }
    } else {
      console.error(`[wb/stocks] ${r.status}`);
    }
  } catch (e) {
    console.error("[wb/stocks] failed:", e instanceof Error ? e.message : String(e));
  }
}

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

    await enrich(token, products);
    return NextResponse.json({ ok: true, count: products.length, products });
  } catch (e) {
    console.error("[wb/cards] fetch failed:", e instanceof Error ? e.message : String(e));
    return NextResponse.json({ ok: false, message: "Не удалось связаться с WB API" }, { status: 200 });
  }
}
