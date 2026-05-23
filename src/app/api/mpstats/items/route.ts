import { NextRequest, NextResponse } from "next/server";
import { getMpstatsItems } from "@/services/mpstatsClient";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    market?: "wb" | "oz";
    keyword?: string;
    ids?: string;
    startRow?: number;
    endRow?: number;
  };
  const result = await getMpstatsItems({
    market: body.market ?? "wb",
    keyword: body.keyword,
    ids: body.ids,
    startRow: body.startRow,
    endRow: body.endRow,
  });
  return NextResponse.json(result, { status: result.ok ? 200 : result.status === "not_configured" ? 200 : 502 });
}
