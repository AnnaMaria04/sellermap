import { NextRequest, NextResponse } from "next/server";
import { getAcceptanceCoefficients } from "@/services/wbClient";

export async function GET(req: NextRequest) {
  const ids = req.nextUrl.searchParams.get("warehouseIds")?.split(",").filter(Boolean);
  const result = await getAcceptanceCoefficients(ids);
  if (!result.ok) return NextResponse.json({ ok: false, status: result.statusCode, message: result.error }, { status: result.statusCode });
  return NextResponse.json(result.data);
}
