import { NextRequest, NextResponse } from "next/server";
import { getCompetitorsByKeyword, getCompetitorsByNmId } from "@/services/marketDataProvider";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { keyword?: string; category?: string; wbNmId?: number | null };
  const result = body.wbNmId
    ? await getCompetitorsByNmId(String(body.wbNmId))
    : await getCompetitorsByKeyword(body.keyword || body.category || "");
  return NextResponse.json(result);
}
