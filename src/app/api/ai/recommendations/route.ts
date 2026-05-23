import { NextRequest, NextResponse } from "next/server";
import { buildRecommendations } from "@/services/aiRecommendationService";
import type { ProductAnalysisDraft } from "@/types/sellermap";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { draft?: ProductAnalysisDraft };
  if (!body.draft) return NextResponse.json({ error: "draft required" }, { status: 400 });
  return NextResponse.json(await buildRecommendations(body.draft));
}
