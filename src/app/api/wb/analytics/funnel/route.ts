import { NextRequest, NextResponse } from "next/server";
import { getAnalyticsFunnel } from "@/services/wbClient";

export async function POST(req: NextRequest) {
  const result = await getAnalyticsFunnel(await req.json());
  if (!result.ok) return NextResponse.json({ ok: false, status: result.statusCode, message: result.error }, { status: result.statusCode });
  return NextResponse.json(result.data);
}
