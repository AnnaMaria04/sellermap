import { NextRequest, NextResponse } from "next/server";
import { getWbPublicMarketByKeyword } from "@/services/wbPublicClient";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q) return NextResponse.json({ error: "q required" }, { status: 400 });

  const result = await getWbPublicMarketByKeyword(q, 100);
  if (result.status !== "success") {
    return NextResponse.json(result, { status: 502 });
  }

  return NextResponse.json({
    source: "wb_public",
    analytics: result.marketStats,
    competitors: result.competitors.slice(0, 10),
    unavailable: {
      estimatedMonthlySales: "requires_mpstats",
      estimatedMonthlyRevenue: "requires_mpstats",
      keywordDemand: "requires_mpstats",
    },
    warnings: result.warnings,
  });
}
