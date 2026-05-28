import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateCardAudit, loadCardAuditData } from "@/lib/analysis/cardAudit";

// Returns the data-driven card audit for a WB nmId, computed from
// wb_product_snapshots (340 rows already in the DB) + tracked_keywords + the
// matching daily_market_metrics row.
export async function GET(req: NextRequest) {
  const nmId = req.nextUrl.searchParams.get("nmId");
  if (!nmId) {
    return NextResponse.json({ ok: false, message: "nmId required" }, { status: 400 });
  }
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, message: "supabase unavailable" }, { status: 500 });
  }
  try {
    const data = await loadCardAuditData(supabase, nmId);
    const items = calculateCardAudit(data);
    return NextResponse.json({
      ok: true,
      items,
      meta: {
        snapshotCount: data.snapshots.length,
        keywordCount: data.trackedKeywords.length,
        hasMarketContext: data.marketContext !== null,
      },
    });
  } catch (e) {
    return NextResponse.json({ ok: false, message: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
