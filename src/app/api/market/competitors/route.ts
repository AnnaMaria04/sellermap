import { NextRequest, NextResponse } from "next/server";
import { buildManualMarketAnalysis, getCompetitorsByKeyword, getCompetitorsByNmId } from "@/services/marketDataProvider";
import type { CompetitorProduct, MarketTarget } from "@/types/sellermap";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    target?: MarketTarget;
    keyword?: string;
    category?: string;
    wbNmId?: number | null;
    manualCompetitors?: CompetitorProduct[];
  };
  const target = body.target;
  if (target?.mode === "manual" && body.manualCompetitors?.length) {
    return NextResponse.json(buildManualMarketAnalysis(body.manualCompetitors));
  }
  if (body.manualCompetitors?.length) {
    return NextResponse.json(buildManualMarketAnalysis(body.manualCompetitors));
  }
  const result =
    target?.wbNmId || body.wbNmId
      ? await getCompetitorsByNmId(Number(target?.wbNmId ?? body.wbNmId))
      : await getCompetitorsByKeyword(target?.keyword || target?.category || body.keyword || body.category || "");
  return NextResponse.json(result);
}
