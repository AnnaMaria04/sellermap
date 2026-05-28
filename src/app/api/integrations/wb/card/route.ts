import { NextRequest, NextResponse } from "next/server";

// Fetch a SINGLE WB product card by article number (nmId) using WB's public
// catalog endpoint. No token needed — this is the public product data shown on
// every WB listing. Used to prefill the add-product form from a WB URL.

// WB shards basket hosts by nmId range. Reference: dev.wildberries.ru public
// docs; the exact basket index changes as the catalog grows.
function basketHost(nmId: number): string {
  const vol = Math.floor(nmId / 100_000);
  let basket = 1;
  if (vol >= 0 && vol <= 143) basket = 1;
  else if (vol <= 287) basket = 2;
  else if (vol <= 431) basket = 3;
  else if (vol <= 719) basket = 4;
  else if (vol <= 1007) basket = 5;
  else if (vol <= 1061) basket = 6;
  else if (vol <= 1115) basket = 7;
  else if (vol <= 1169) basket = 8;
  else if (vol <= 1313) basket = 9;
  else if (vol <= 1601) basket = 10;
  else if (vol <= 1655) basket = 11;
  else if (vol <= 1919) basket = 12;
  else if (vol <= 2045) basket = 13;
  else if (vol <= 2189) basket = 14;
  else if (vol <= 2405) basket = 15;
  else if (vol <= 2621) basket = 16;
  else if (vol <= 2837) basket = 17;
  else if (vol <= 3053) basket = 18;
  else basket = 19;
  return `basket-${String(basket).padStart(2, "0")}.wbbasket.ru`;
}

/** Extract the WB article number (nmId) from a URL or a raw number. */
function parseNmId(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  // Direct number
  if (/^\d{5,12}$/.test(trimmed)) return Number(trimmed);
  // URL — match /catalog/<nmId>/...
  const m = trimmed.match(/\/catalog\/(\d{5,12})/);
  if (m) return Number(m[1]);
  // Some links use ?nmId=...
  const q = trimmed.match(/[?&]nmid=(\d{5,12})/i);
  if (q) return Number(q[1]);
  return null;
}

interface DetailJson {
  data?: {
    products?: Array<{
      id?: number; root?: number; name?: string; brand?: string; subjectName?: string;
      salePriceU?: number; priceU?: number; sizes?: Array<{ price?: { product?: number; total?: number } }>;
    }>;
  };
}

interface CardJson {
  imt_name?: string;
  imt_id?: number;
  subj_name?: string;
  description?: string;
  media?: { photo_count?: number };
}

const DETAIL_URL = (nmId: number) =>
  `https://card.wb.ru/cards/v1/detail?appType=1&curr=rub&dest=-1257786&spp=30&nm=${nmId}`;

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { url?: string };
  const nmId = parseNmId(body.url ?? "");
  if (!nmId) {
    return NextResponse.json({ ok: false, message: "Не удалось извлечь артикул из ссылки или числа" }, { status: 200 });
  }

  try {
    // 1) Detail (price + name)
    const detailRes = await fetch(DETAIL_URL(nmId), {
      cache: "no-store", signal: AbortSignal.timeout(15000),
      headers: { Accept: "application/json" },
    });
    if (!detailRes.ok) {
      console.error(`[wb/card] detail ${detailRes.status}`);
      return NextResponse.json({ ok: false, message: `WB API ответил ${detailRes.status}` }, { status: 200 });
    }
    const detail = (await detailRes.json()) as DetailJson;
    const p = detail.data?.products?.[0];
    if (!p || p.id !== nmId) {
      return NextResponse.json({ ok: false, message: "Товар не найден в WB" }, { status: 200 });
    }
    const total = p.sizes?.[0]?.price?.total ?? p.sizes?.[0]?.price?.product ?? p.salePriceU ?? p.priceU ?? 0;
    const price = Math.round(total / 100);

    // 2) Card metadata (description + image count) — best-effort.
    let description: string | undefined;
    let photoCount = 1;
    try {
      const host = basketHost(nmId);
      const vol = Math.floor(nmId / 100_000);
      const part = Math.floor(nmId / 1_000);
      const cardRes = await fetch(`https://${host}/vol${vol}/part${part}/${nmId}/info/ru/card.json`, {
        cache: "no-store", signal: AbortSignal.timeout(10000),
      });
      if (cardRes.ok) {
        const c = (await cardRes.json()) as CardJson;
        description = c.description;
        photoCount = Math.max(1, c.media?.photo_count ?? 1);
      }
    } catch { /* photo basket may be inaccessible — leave defaults */ }

    // 3) Image URLs (basket-hosted).
    const host = basketHost(nmId);
    const vol = Math.floor(nmId / 100_000);
    const part = Math.floor(nmId / 1_000);
    const images: string[] = [];
    for (let i = 1; i <= Math.min(photoCount, 6); i++) {
      images.push(`https://${host}/vol${vol}/part${part}/${nmId}/images/big/${i}.webp`);
    }

    return NextResponse.json({
      ok: true,
      nmId,
      name: p.name ?? "",
      brand: p.brand,
      category: p.subjectName ?? "",
      price,
      images,
      description,
    });
  } catch (e) {
    console.error("[wb/card] failed:", e instanceof Error ? e.message : String(e));
    return NextResponse.json({ ok: false, message: "Не удалось связаться с WB" }, { status: 200 });
  }
}
