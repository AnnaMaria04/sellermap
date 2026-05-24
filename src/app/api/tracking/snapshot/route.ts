import { NextRequest, NextResponse } from "next/server";
import { estimateSalesFromSnapshots } from "@/lib/analysis/sales-estimation";
import { ownWbCollectorProvider } from "@/lib/providers/market/own-wb-collector-provider";
import { getProductHistory } from "@/lib/analysis/historical-metrics";
import { supabaseRest } from "@/services/supabaseRest";

type TrackedProductRow = {
  id: string;
  nm_id: string;
  keywords: string[] | null;
  priority: number | null;
};

function unauthorized(req: NextRequest) {
  if (!process.env.CRON_SECRET) return process.env.NODE_ENV === "production";
  const authorization = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const secret = req.headers.get("x-cron-secret") ?? authorization ?? req.nextUrl.searchParams.get("secret");
  return secret !== process.env.CRON_SECRET;
}

export async function POST(req: NextRequest) {
  if (unauthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const limit = Number(process.env.DAILY_TRACKING_LIMIT ?? 100);
  const tracked = await supabaseRest<TrackedProductRow[]>("tracked_products", {
    query: {
      select: "id,nm_id,keywords,priority",
      tracking_status: "eq.active",
      order: "priority.asc,last_checked_at.asc.nullsfirst",
      limit: String(limit),
    },
  });

  if (!tracked.ok) return NextResponse.json({ status: tracked.status, error: tracked.error }, { status: 200 });

  const saved: string[] = [];
  const salesEstimates: string[] = [];
  const warnings: string[] = [];

  for (const item of tracked.data) {
    try {
      const detail = await ownWbCollectorProvider.getProductDetails?.(item.nm_id);
      if (!detail) {
        warnings.push(`NO_DETAIL:${item.nm_id}`);
        continue;
      }

      await supabaseRest("wb_product_snapshots", {
        method: "POST",
        body: JSON.stringify({
          nm_id: detail.nmId,
          query: item.keywords?.[0] ?? detail.searchKeyword,
          provider: "own-wb",
          title: detail.title,
          brand: detail.brand,
          seller_name: detail.sellerName,
          seller_id: detail.sellerId,
          price_rub: detail.priceRub,
          original_price_rub: detail.originalPriceRub,
          rating: detail.rating,
          review_count: detail.reviewCount,
          image_url: detail.imageUrl,
          product_url: detail.productUrl,
          category: detail.category,
          subject: detail.subject,
          search_position: detail.searchPosition,
          stock_signal: detail.stockSignal,
          raw_payload: detail.raw ?? detail,
        }),
      });
      await supabaseRest("tracked_products", {
        method: "PATCH",
        query: { id: `eq.${item.id}` },
        body: JSON.stringify({ last_checked_at: new Date().toISOString() }),
      });
      saved.push(item.nm_id);

      const history = await getProductHistory(item.nm_id, 45);
      if (history.ok) {
        const estimate = estimateSalesFromSnapshots(item.nm_id, history.data);
        await supabaseRest("sales_estimates", {
          method: "POST",
          body: JSON.stringify({
            nm_id: item.nm_id,
            estimate_date: new Date().toISOString().slice(0, 10),
            method: estimate.method,
            estimated_sales_low: estimate.estimatedSalesLow,
            estimated_sales_mid: estimate.estimatedSalesMid,
            estimated_sales_high: estimate.estimatedSalesHigh,
            estimated_revenue_low: estimate.estimatedRevenueLow,
            estimated_revenue_high: estimate.estimatedRevenueHigh,
            confidence_level: estimate.confidenceLevel,
            features_json: { ...estimate.features, explanation: estimate.explanation },
          }),
        });
        salesEstimates.push(item.nm_id);
      }
    } catch (error) {
      warnings.push(error instanceof Error ? `${item.nm_id}:${error.message}` : `${item.nm_id}:unknown_error`);
    }
  }

  return NextResponse.json({
    ok: true,
    provider: "own-wb",
    checked: tracked.data.length,
    saved: saved.length,
    salesEstimates: salesEstimates.length,
    apifyUsed: false,
    warnings,
  });
}

export const GET = POST;
