import { NextRequest, NextResponse } from "next/server";
import { searchSimilarProducts } from "@/services/marketDataProvider";
import { supabaseRest } from "@/services/supabaseRest";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const tracked = await supabaseRest<Array<{ nm_id: string; keywords: string[] | null }>>("tracked_products", {
    query: {
      select: "nm_id,keywords",
      tracking_status: "eq.active",
      limit: "50",
    },
  });
  if (!tracked.ok) return NextResponse.json({ status: tracked.status, error: tracked.error }, { status: 200 });

  const saved: unknown[] = [];
  for (const item of tracked.data) {
    const keyword = item.keywords?.[0];
    if (!keyword) continue;
    const market = await searchSimilarProducts(keyword, { limit: 50 });
    const product = market.competitors.find((competitor) => String(competitor.nmId) === item.nm_id);
    if (!product) continue;
    saved.push(product);
    await supabaseRest("wb_product_snapshots", {
      method: "POST",
      body: JSON.stringify({
        nm_id: String(product.nmId ?? item.nm_id),
        query: keyword,
        provider: product.source,
        title: product.title,
        brand: product.brand,
        seller_name: product.sellerName,
        price_rub: product.price,
        rating: product.rating,
        review_count: product.reviewCount,
        image_url: product.image,
        product_url: product.url,
        search_position: product.searchPosition,
        stock_signal: product.stockSignal,
        estimated_monthly_sales: product.estimatedSales,
        raw_payload: product,
      }),
    });
  }

  return NextResponse.json({ ok: true, checked: tracked.data.length, saved: saved.length });
}
