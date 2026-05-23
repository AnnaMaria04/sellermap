import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    rates: {
      USD_RUB: 90,
      CNY_RUB: 12.5,
      EUR_RUB: 98,
    },
    source: "manual_fallback",
    updatedAt: new Date().toISOString(),
  });
}
