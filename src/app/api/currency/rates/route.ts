import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    base: "RUB",
    rates: {
      USD: 90,
      CNY: 12.5,
    },
    source: "manual_fallback",
    updatedAt: new Date().toISOString(),
  });
}
