import { NextRequest, NextResponse } from "next/server";
import { wbClient } from "@/services/wbClient";

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  const result = await wbClient("common", `/api/v1/tariffs/box?date=${encodeURIComponent(date)}`);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.statusCode });
  return NextResponse.json(result.data);
}
