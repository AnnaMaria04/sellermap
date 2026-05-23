import { NextRequest, NextResponse } from "next/server";
import {
  getSellerCardsList,
  getSellerGoodsByFilter,
} from "@/lib/integrations/wb/products";

export async function GET(req: NextRequest) {
  const nm = req.nextUrl.searchParams.get("nm");
  const cards = req.nextUrl.searchParams.get("cards");
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? 10);

  const result = cards === "1"
    ? await getSellerCardsList(limit)
    : await getSellerGoodsByFilter({
        limit,
        nmID: nm ? Number(nm) : undefined,
      });

  return NextResponse.json(result);
}
