import { NextRequest, NextResponse } from "next/server";
import { getWbPublicProduct } from "@/services/wbPublicClient";

export async function GET(req: NextRequest) {
  const rawNmId = req.nextUrl.searchParams.get("nmId") ?? req.nextUrl.searchParams.get("nm");
  const nmId = Number(rawNmId);
  if (!Number.isFinite(nmId) || nmId <= 0) {
    return NextResponse.json({ error: "nmId required" }, { status: 400 });
  }

  try {
    const product = await getWbPublicProduct(nmId);
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    return NextResponse.json({
      source: "wb_public",
      product,
      note: "Публичная карточка WB без seller token.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "WB public product error",
        detail: error instanceof Error ? error.message : "unknown",
      },
      { status: 502 },
    );
  }
}
