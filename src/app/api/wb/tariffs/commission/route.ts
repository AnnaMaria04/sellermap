import { NextResponse } from "next/server";
import { wbClient } from "@/services/wbClient";

export async function GET() {
  const result = await wbClient("common", "/api/v1/tariffs/commission");
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.statusCode });
  return NextResponse.json(result.data);
}
