import { NextRequest, NextResponse } from "next/server";
import { searchMarketProducts } from "@/lib/providers/market";
import { saveWbSnapshots } from "@/services/dataFlywheel";
import { supabaseRest } from "@/services/supabaseRest";

type TrackedKeywordRow = {
  id: string;
  keyword: string;
  category_guess: string | null;
  priority: number | null;
};

function unauthorized(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret");
  return Boolean(process.env.CRON_SECRET && secret !== process.env.CRON_SECRET);
}

export async function POST(req: NextRequest) {
  if (unauthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const limit = Number(process.env.DAILY_KEYWORD_LIMIT ?? 20);
  const tracked = await supabaseRest<TrackedKeywordRow[]>("tracked_keywords", {
    query: {
      select: "id,keyword,category_guess,priority",
      tracking_status: "eq.active",
      order: "priority.asc,last_checked_at.asc.nullsfirst",
      limit: String(limit),
    },
  });

  if (!tracked.ok) return NextResponse.json({ status: tracked.status, error: tracked.error }, { status: 200 });

  const refreshed: string[] = [];
  const warnings: string[] = [];
  for (const item of tracked.data) {
    try {
      const market = await searchMarketProducts([item.keyword], Number(process.env.FREE_USER_MAX_RESULTS_PER_KEYWORD ?? 20));
      await saveWbSnapshots(market.products, market.providersUsed, item.category_guess);
      await supabaseRest("tracked_keywords", {
        method: "PATCH",
        query: { id: `eq.${item.id}` },
        body: JSON.stringify({ last_checked_at: new Date().toISOString() }),
      });
      refreshed.push(item.keyword);
      warnings.push(...market.warnings);
    } catch (error) {
      warnings.push(error instanceof Error ? `${item.keyword}:${error.message}` : `${item.keyword}:unknown_error`);
    }
  }

  return NextResponse.json({
    ok: true,
    checked: tracked.data.length,
    refreshed: refreshed.length,
    apifyUsed: false,
    warnings: [...new Set(warnings)],
  });
}
