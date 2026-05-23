import { NextRequest, NextResponse } from "next/server";
import { getMpstatsItemFull } from "@/services/mpstatsClient";

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const market = (req.nextUrl.searchParams.get("market") === "oz" ? "oz" : "wb") as "wb" | "oz";
  const result = await getMpstatsItemFull(market, id);
  return NextResponse.json(result, { status: result.ok ? 200 : result.status === "not_configured" ? 200 : 502 });
}
