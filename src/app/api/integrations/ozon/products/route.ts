import { NextRequest, NextResponse } from "next/server";

// Ozon Seller API — product list + info + prices. Server-side only.
// Auth: Client-Id + Api-Key headers.
const BASE = "https://api-seller.ozon.ru";

type RawProduct = { externalId: string; name: string; sku?: string; barcode?: string; price?: number };

interface ListItem { product_id?: number; offer_id?: string }
interface InfoItem { id?: number; offer_id?: string; name?: string; barcodes?: string[]; barcode?: string }
interface PriceItem { offer_id?: string; price?: { price?: string | number; marketing_price?: string | number } }

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { clientId?: string; apiKey?: string; test?: boolean };
  const clientId = body.clientId?.trim();
  const apiKey = body.apiKey?.trim();
  const test = body.test === true;
  if (!clientId || !apiKey) {
    return NextResponse.json({ ok: false, message: "Введите Client-Id и Api-Key" }, { status: 400 });
  }

  const headers = { "Client-Id": clientId, "Api-Key": apiKey, "Content-Type": "application/json" };
  const post = (path: string, payload: unknown) =>
    fetch(`${BASE}${path}`, { method: "POST", headers, body: JSON.stringify(payload), cache: "no-store", signal: AbortSignal.timeout(20000) });

  try {
    // 1) product list (paginated by last_id)
    const items: ListItem[] = [];
    let lastId = "";
    for (let page = 0; page < 20; page++) {
      const r = await post("/v3/product/list", { filter: { visibility: "ALL" }, last_id: lastId, limit: test ? 1 : 1000 });
      if (r.status === 401 || r.status === 403) {
        return NextResponse.json({ ok: false, message: "Неверный Client-Id или Api-Key" }, { status: 200 });
      }
      if (!r.ok) {
        const t = await r.text().catch(() => "");
        console.error(`[ozon/list] ${r.status}: ${t.slice(0, 200)}`);
        return NextResponse.json({ ok: false, message: `Ozon API ${r.status}` }, { status: 200 });
      }
      const d = (await r.json()) as { result?: { items?: ListItem[]; last_id?: string } };
      const batch = d.result?.items ?? [];
      items.push(...batch);
      lastId = d.result?.last_id ?? "";
      if (test) break;
      if (!lastId || batch.length === 0) break;
    }

    if (test) return NextResponse.json({ ok: true, count: items.length });
    if (items.length === 0) return NextResponse.json({ ok: true, count: 0, products: [] });

    // 2) product info (names, barcodes) in batches of 1000 by offer_id
    const byOffer = new Map<string, RawProduct>();
    for (const it of items) {
      if (!it.product_id) continue;
      byOffer.set(it.offer_id ?? String(it.product_id), {
        externalId: String(it.product_id),
        name: it.offer_id ?? String(it.product_id),
        sku: it.offer_id,
      });
    }
    const offerIds = items.map((i) => i.offer_id).filter((x): x is string => !!x);
    for (let i = 0; i < offerIds.length; i += 1000) {
      const chunk = offerIds.slice(i, i + 1000);
      const r = await post("/v3/product/info/list", { offer_id: chunk, product_id: [], sku: [] });
      if (!r.ok) { console.error(`[ozon/info] ${r.status}`); continue; }
      const d = (await r.json()) as { items?: InfoItem[]; result?: { items?: InfoItem[] } };
      const infos = d.items ?? d.result?.items ?? [];
      for (const info of infos) {
        const key = info.offer_id ?? String(info.id);
        const p = byOffer.get(key);
        if (!p) continue;
        if (info.name) p.name = info.name;
        p.barcode = info.barcodes?.[0] ?? info.barcode;
      }
    }

    // 3) prices
    try {
      let cursor = "";
      for (let page = 0; page < 20; page++) {
        const r = await post("/v5/product/info/prices", { cursor, limit: 1000, filter: { visibility: "ALL" } });
        if (!r.ok) { console.error(`[ozon/prices] ${r.status}`); break; }
        const d = (await r.json()) as { items?: PriceItem[]; cursor?: string };
        for (const pi of d.items ?? []) {
          const p = pi.offer_id ? byOffer.get(pi.offer_id) : undefined;
          if (p) p.price = Number(pi.price?.marketing_price || pi.price?.price || 0) || undefined;
        }
        cursor = d.cursor ?? "";
        if (!cursor || (d.items ?? []).length === 0) break;
      }
    } catch (e) {
      console.error("[ozon/prices] failed:", e instanceof Error ? e.message : String(e));
    }

    return NextResponse.json({ ok: true, count: byOffer.size, products: [...byOffer.values()] });
  } catch (e) {
    console.error("[ozon/products] failed:", e instanceof Error ? e.message : String(e));
    return NextResponse.json({ ok: false, message: "Не удалось связаться с Ozon API" }, { status: 200 });
  }
}
