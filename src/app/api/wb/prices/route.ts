import { NextRequest, NextResponse } from "next/server";
import { getPrices } from "@/services/wbClient";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { nmIds?: number[] };
  if (!body.nmIds?.length) return NextResponse.json({ error: "nmIds required" }, { status: 400 });
  const result = await getPrices(body.nmIds);
  if (!result.ok) return NextResponse.json({ ok: false, status: result.statusCode, message: result.error }, { status: result.statusCode });
  return NextResponse.json(result.data);
}
