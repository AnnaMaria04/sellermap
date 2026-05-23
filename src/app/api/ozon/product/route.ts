import { NextRequest, NextResponse } from "next/server";
import { getOzonProductInfo } from "@/services/ozonClient";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { productId?: number };
  if (!body.productId) return NextResponse.json({ error: "productId required" }, { status: 400 });
  return NextResponse.json(await getOzonProductInfo(body.productId));
}
