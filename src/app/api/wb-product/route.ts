import { NextRequest, NextResponse } from "next/server";

const WB_REGIONS =
  "80,38,83,4,64,33,68,70,30,40,86,75,69,22,1,31,66,110,48,71,114";

function getBasketHost(nmId: string) {
  const vol = Math.floor(Number(nmId) / 100000);
  if (vol <= 143) return "basket-01.wbbasket.ru";
  if (vol <= 287) return "basket-02.wbbasket.ru";
  if (vol <= 431) return "basket-03.wbbasket.ru";
  if (vol <= 719) return "basket-04.wbbasket.ru";
  if (vol <= 1007) return "basket-05.wbbasket.ru";
  if (vol <= 1061) return "basket-06.wbbasket.ru";
  if (vol <= 1115) return "basket-07.wbbasket.ru";
  if (vol <= 1169) return "basket-08.wbbasket.ru";
  if (vol <= 1313) return "basket-09.wbbasket.ru";
  if (vol <= 1601) return "basket-10.wbbasket.ru";
  if (vol <= 1655) return "basket-11.wbbasket.ru";
  if (vol <= 1919) return "basket-12.wbbasket.ru";
  if (vol <= 2045) return "basket-13.wbbasket.ru";
  if (vol <= 2189) return "basket-14.wbbasket.ru";
  if (vol <= 2405) return "basket-15.wbbasket.ru";
  return "basket-16.wbbasket.ru";
}

async function fetchBasketCard(nmId: string) {
  const vol = Math.floor(Number(nmId) / 100000);
  const part = Math.floor(Number(nmId) / 1000);
  const host = getBasketHost(nmId);
  const res = await fetch(
    `https://${host}/vol${vol}/part${part}/${nmId}/info/ru/card.json`,
    { next: { revalidate: 300 } },
  );

  if (!res.ok) return null;
  return res.json();
}

export async function GET(req: NextRequest) {
  const nmId = req.nextUrl.searchParams.get("nm");
  if (!nmId) {
    return NextResponse.json({ error: "nm required" }, { status: 400 });
  }

  try {
    const catalogUrls = [
      `https://card.wb.ru/cards/v4/detail?appType=1&nm=${nmId}&curr=rub&dest=-1257786&spp=30`,
      `https://card.wb.ru/cards/v2/detail?appType=1&nm=${nmId}&curr=rub&dest=-1257786&regions=${WB_REGIONS}&spp=30`,
      `https://card.wb.ru/cards/detail?appType=1&nm=${nmId}&curr=rub&dest=-1257786&regions=${WB_REGIONS}&spp=30`,
    ];

    for (const url of catalogUrls) {
      const catalogRes = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        next: { revalidate: 300 },
      });
      if (!catalogRes.ok || !(catalogRes.headers.get("content-type") ?? "").includes("application/json")) continue;
      const data = await catalogRes.json();
      const product = data?.products?.[0] ?? data?.data?.products?.[0];

      if (product) {
        return NextResponse.json({
          nmId: product.id,
          name: product.name,
          brand: product.brand,
          category: product.subjectName ?? product.entity ?? "",
          price: product.salePriceU ? product.salePriceU / 100 : null,
          priceOriginal: product.priceU ? product.priceU / 100 : null,
          rating: product.reviewRating ?? product.nmReviewRating ?? product.rating ?? null,
          reviewCount: product.feedbacks ?? product.nmFeedbacks ?? null,
          photos: product.photos ?? [],
          colors: product.colors ?? [],
          sizes: product.sizes ?? [],
          supplier: product.supplier,
          supplierId: product.supplierId,
          source: "catalog_public",
        });
      }
    }

    const basketProduct = await fetchBasketCard(nmId);
    if (!basketProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({
      nmId: basketProduct.nm_id,
      name: basketProduct.imt_name,
      brand: basketProduct.selling?.brand_name ?? "",
      category: basketProduct.subj_name,
      price: null,
      priceOriginal: null,
      rating: null,
      reviewCount: null,
      photos: [],
      colors: [],
      sizes: [],
      supplier: basketProduct.selling?.supplier_name ?? "",
      supplierId: null,
      source: "basket",
    });
  } catch {
    return NextResponse.json({ error: "WB API error" }, { status: 502 });
  }
}
